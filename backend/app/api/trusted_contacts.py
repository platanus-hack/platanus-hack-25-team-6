from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from ..schemas.trusted_contact import (
    TrustedContactCreate,
    TrustedContactUpdate,
    TrustedContactResponse,
    BulkTrustedContactCreate
)
from ..models.trusted_contact import TrustedContact
from ..core.database import get_database
from ..utils.auth import get_current_user

router = APIRouter(prefix="/trusted-contacts", tags=["trusted-contacts"])


@router.post("/", response_model=TrustedContactResponse)
async def create_trusted_contact(
    contact_data: TrustedContactCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new trusted contact for the current user"""
    db = get_database()

    # Check if contact already exists for this user
    existing = await db.trusted_contacts.find_one({
        "user_id": current_user["user_id"],
        "phone": contact_data.phone
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Este contacto ya existe en tu lista de cercanos"
        )

    # Create contact
    contact = TrustedContact(
        id=str(uuid.uuid4()),
        user_id=current_user["user_id"],
        name=contact_data.name,
        phone=contact_data.phone,
        relationship=contact_data.relationship
    )

    contact_dict = contact.model_dump(by_alias=True, exclude={"id"})
    contact_dict["_id"] = contact.id

    await db.trusted_contacts.insert_one(contact_dict)

    return TrustedContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        name=contact.name,
        phone=contact.phone,
        relationship=contact.relationship,
        created_at=contact.created_at.isoformat(),
        updated_at=contact.updated_at.isoformat()
    )


@router.post("/bulk", response_model=List[TrustedContactResponse])
async def create_bulk_trusted_contacts(
    bulk_data: BulkTrustedContactCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create multiple trusted contacts at once (for onboarding)"""
    db = get_database()

    created_contacts = []

    for contact_data in bulk_data.contacts:
        # Skip if already exists
        existing = await db.trusted_contacts.find_one({
            "user_id": current_user["user_id"],
            "phone": contact_data.phone
        })

        if existing:
            continue

        # Create contact
        contact = TrustedContact(
            id=str(uuid.uuid4()),
            user_id=current_user["user_id"],
            name=contact_data.name,
            phone=contact_data.phone,
            relationship=contact_data.relationship
        )

        contact_dict = contact.model_dump(by_alias=True, exclude={"id"})
        contact_dict["_id"] = contact.id

        await db.trusted_contacts.insert_one(contact_dict)

        created_contacts.append(TrustedContactResponse(
            id=contact.id,
            user_id=contact.user_id,
            name=contact.name,
            phone=contact.phone,
            relationship=contact.relationship,
            created_at=contact.created_at.isoformat(),
            updated_at=contact.updated_at.isoformat()
        ))

    return created_contacts


@router.get("/", response_model=List[TrustedContactResponse])
async def list_trusted_contacts(
    current_user: dict = Depends(get_current_user)
):
    """Get all trusted contacts for the current user"""
    db = get_database()

    contacts = await db.trusted_contacts.find({
        "user_id": current_user["user_id"]
    }).to_list(length=100)

    return [
        TrustedContactResponse(
            id=contact["_id"],
            user_id=contact["user_id"],
            name=contact["name"],
            phone=contact["phone"],
            relationship=contact.get("relationship"),
            created_at=contact["created_at"].isoformat(),
            updated_at=contact["updated_at"].isoformat()
        )
        for contact in contacts
    ]


@router.get("/{contact_id}", response_model=TrustedContactResponse)
async def get_trusted_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific trusted contact"""
    db = get_database()

    contact = await db.trusted_contacts.find_one({
        "_id": contact_id,
        "user_id": current_user["user_id"]
    })

    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    return TrustedContactResponse(
        id=contact["_id"],
        user_id=contact["user_id"],
        name=contact["name"],
        phone=contact["phone"],
        relationship=contact.get("relationship"),
        created_at=contact["created_at"].isoformat(),
        updated_at=contact["updated_at"].isoformat()
    )


@router.put("/{contact_id}", response_model=TrustedContactResponse)
async def update_trusted_contact(
    contact_id: str,
    contact_data: TrustedContactUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a trusted contact"""
    db = get_database()

    # Check if contact exists and belongs to user
    existing = await db.trusted_contacts.find_one({
        "_id": contact_id,
        "user_id": current_user["user_id"]
    })

    if not existing:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    # Build update data
    update_data = {"updated_at": datetime.utcnow()}

    if contact_data.name is not None:
        update_data["name"] = contact_data.name
    if contact_data.phone is not None:
        update_data["phone"] = contact_data.phone
    if contact_data.relationship is not None:
        update_data["relationship"] = contact_data.relationship

    # Update contact
    await db.trusted_contacts.update_one(
        {"_id": contact_id},
        {"$set": update_data}
    )

    # Get updated contact
    updated = await db.trusted_contacts.find_one({"_id": contact_id})

    return TrustedContactResponse(
        id=updated["_id"],
        user_id=updated["user_id"],
        name=updated["name"],
        phone=updated["phone"],
        relationship=updated.get("relationship"),
        created_at=updated["created_at"].isoformat(),
        updated_at=updated["updated_at"].isoformat()
    )


@router.delete("/{contact_id}")
async def delete_trusted_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a trusted contact"""
    db = get_database()

    result = await db.trusted_contacts.delete_one({
        "_id": contact_id,
        "user_id": current_user["user_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    return {"message": "Contacto eliminado exitosamente"}
