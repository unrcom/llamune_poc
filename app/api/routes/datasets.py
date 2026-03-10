from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Dataset
from app.schemas.dataset import DatasetCreate, DatasetUpdate, DatasetResponse
from app.core.auth import get_current_user, get_current_admin
from app.models.base import User
from typing import List

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=List[DatasetResponse])
def get_datasets(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Dataset).order_by(Dataset.is_system.desc(), Dataset.created_at).all()

@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_system_dataset(
    data: DatasetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    dataset = Dataset(
        name=data.name,
        description=data.description,
        is_system=True,
        created_by=current_user.id,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset

@router.post("/user", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_user_dataset(
    data: DatasetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = Dataset(
        name=data.name,
        description=data.description,
        is_system=False,
        created_by=current_user.id,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset

@router.put("/{dataset_id}", response_model=DatasetResponse)
def update_dataset(
    dataset_id: int,
    data: DatasetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if dataset.is_system:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System datasets cannot be modified")
    if dataset.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if data.name is not None:
        dataset.name = data.name
    if data.description is not None:
        dataset.description = data.description
    db.commit()
    db.refresh(dataset)
    return dataset

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")
    if dataset.is_system:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System datasets cannot be deleted")
    if dataset.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    db.delete(dataset)
    db.commit()
