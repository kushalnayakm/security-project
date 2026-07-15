import logging
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import require_entity_staff, require_entity_owner
from app.models.dynamic_form import DynamicForm
from app.models.form_field import FormField
from app.models.form_submission import FormSubmission
from app.models.qr_code import QrCode
from app.schemas.entity import EntityRegisterRequest, BranchCreate
from app.schemas.forms import CertificateCreate, DynamicFormCreate, DynamicFormUpdate, PublishFormRequest, WelcomeUpdateRequest
from app.services.auth_service import AuthService
from app.services.entity_service import EntityService
from app.utils.upload import save_upload_file
from app.utils.qr_generator import generate_qr_image
from app.utils.responses import success_response


router = APIRouter(prefix="/entity")
entity_service = EntityService()
auth_service = AuthService()
logger = logging.getLogger(__name__)


def _can_access_entity(actor: dict, entity_id: str | None) -> bool:
    return actor.get("role") == "ADMIN" or actor.get("entity_id") == entity_id


def _serialize_field(field: FormField) -> dict:
    return {
        "field_id": str(field.field_id),
        "label": field.label,
        "type": field.type,
        "is_required": field.is_required,
        "options": field.options,
        "field_order": field.field_order,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_entity(
    # Entity Info (Step 1)
    name: str = Form(...),
    gstNo: str = Form(...),
    gstDoc: UploadFile | None = File(None),
    businessType: str | None = Form(None),
    address: str | None = Form(None),
    contactPerson: str | None = Form(None),
    phone: str = Form(...),
    email: str = Form(...),
    # Personal Details (Step 2)
    firstName: str = Form(...),
    midName: str | None = Form(None),
    lastName: str = Form(...),
    fatherName: str | None = Form(None),
    motherName: str | None = Form(None),
    spouseName: str | None = Form(None),
    sex: str = Form(...),
    dob: str = Form(...),
    # Entity/Operator/Document (Step 3)
    entityName: str = Form(...),
    branchName: str | None = Form(None),
    entityLogo: UploadFile | None = File(None),
    operatorPhoto: UploadFile | None = File(None),
    userDocument: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_db)
) -> dict:
    logger.info("Request received for entity registration")
    
    # Save files to disk first
    gst_doc_path = None
    gst_doc_original = None
    gst_doc_size = None
    gst_doc_mime = None
    if gstDoc:
        gst_doc_path = await save_upload_file(gstDoc)
        gst_doc_original = gstDoc.filename
        gst_doc_size = gstDoc.size
        gst_doc_mime = gstDoc.content_type
    
    entity_logo_path = None
    entity_logo_original = None
    entity_logo_size = None
    entity_logo_mime = None
    if entityLogo:
        entity_logo_path = await save_upload_file(entityLogo)
        entity_logo_original = entityLogo.filename
        entity_logo_size = entityLogo.size
        entity_logo_mime = entityLogo.content_type
    
    operator_photo_path = None
    operator_photo_original = None
    operator_photo_size = None
    operator_photo_mime = None
    if operatorPhoto:
        operator_photo_path = await save_upload_file(operatorPhoto)
        operator_photo_original = operatorPhoto.filename
        operator_photo_size = operatorPhoto.size
        operator_photo_mime = operatorPhoto.content_type
    
    user_document_path = None
    user_document_original = None
    user_document_size = None
    user_document_mime = None
    if userDocument:
        user_document_path = await save_upload_file(userDocument)
        user_document_original = userDocument.filename
        user_document_size = userDocument.size
        user_document_mime = userDocument.content_type

    # Call the updated register_entity service which no longer needs password
    from app.schemas.entity import EntityRegisterRequest
    payload = EntityRegisterRequest(
        name=name,
        gstNo=gstNo,
        gstDocUrl=gst_doc_path,
        businessType=businessType,
        address=address,
        contactPerson=contactPerson,
        phone=phone,
        email=email,
        password="",  # Empty password - OTP based auth
    )
    # Add extra fields that the service might need
    payload_dict = payload.model_dump()
    payload_dict.update({
        "firstName": firstName,
        "midName": midName,
        "lastName": lastName,
        "fatherName": fatherName,
        "motherName": motherName,
        "spouseName": spouseName,
        "sex": sex,
        "dob": dob,
        "entityName": entityName,
        "branchName": branchName,
        "entityLogoUrl": entity_logo_path,
        "operatorPhotoUrl": operator_photo_path,
        "userDocumentUrl": user_document_path,
    })
    
    logger.info("Entity registration request model: %s", payload)
    logger.info("Validation successful for entity registration")
    result = await auth_service.register_entity(session, payload_dict)
    
    # Save document records to database with entity_id and user_id
    entity_id = result.get("entity_id")
    user_id = result.get("user_id")
    
    if entity_id and user_id:
        from app.utils.upload import save_document_record
        from app.models.document import Document
        
        if gst_doc_path:
            await save_document_record(
                session, entity_id, user_id, "gst_document",
                gst_doc_path, gst_doc_original, gst_doc_size, gst_doc_mime
            )
        if entity_logo_path:
            await save_document_record(
                session, entity_id, user_id, "entity_logo",
                entity_logo_path, entity_logo_original, entity_logo_size, entity_logo_mime
            )
        if operator_photo_path:
            await save_document_record(
                session, entity_id, user_id, "operator_photo",
                operator_photo_path, operator_photo_original, operator_photo_size, operator_photo_mime
            )
        if user_document_path:
            await save_document_record(
                session, entity_id, user_id, "user_document",
                user_document_path, user_document_original, user_document_size, user_document_mime
            )
    
    return success_response(result)


@router.post("/branches", dependencies=[Depends(require_entity_owner)], status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_owner)
) -> dict:
    payload_dict = payload.model_dump()
    payload_dict["parentEntityId"] = actor.get("entity_id")
    
    # Create the branch entity
    branch = await entity_service.create_entity(session, payload_dict, created_by=actor.get("user_id"))
    return success_response({"entity_id": str(branch.entity_id)})


@router.get("/forms", dependencies=[Depends(require_entity_staff)])
async def get_forms(entity_id: str | None = None, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    
    stmt = select(DynamicForm).order_by(DynamicForm.created_at.desc())
    if target_entity_id:
        stmt = stmt.where(DynamicForm.entity_id == target_entity_id)
        
    forms = (await session.execute(stmt)).scalars().all()
    available_field_types = [
        {"type": "TEXT", "label": "Short Text", "supportsOptions": False},
        {"type": "NUMBER", "label": "Number", "supportsOptions": False},
        {"type": "DATE", "label": "Date", "supportsOptions": False},
        {"type": "EMAIL", "label": "Email", "supportsOptions": False},
        {"type": "PHONE", "label": "Phone", "supportsOptions": False},
        {"type": "SELECT", "label": "Dropdown", "supportsOptions": True},
        {"type": "RADIO", "label": "Radio Group", "supportsOptions": True},
        {"type": "CHECKBOX", "label": "Checkbox", "supportsOptions": True},
    ]
    existing = [{"form_id": form.form_id, "title": form.title, "isActive": form.is_active, "createdAt": form.created_at} for form in forms]
    return success_response({"availableFieldTypes": available_field_types, "existingForms": existing})


@router.post("/forms", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def create_form(payload: DynamicFormCreate, entity_id: str | None = None, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    if not target_entity_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Entity scope is missing.")
    form = await entity_service.create_form(session, target_entity_id, payload.model_dump())
    return success_response({"form_id": form.form_id})


@router.get("/forms/{form_id}", dependencies=[Depends(require_entity_staff)])
async def get_form_detail(
    form_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this form.")

    fields = (
        await session.execute(select(FormField).where(FormField.form_id == form.form_id).order_by(FormField.field_order))
    ).scalars().all()

    return success_response({
        "form_id": str(form.form_id),
        "entity_id": str(form.entity_id),
        "title": form.title,
        "description": form.description,
        "isActive": form.is_active,
        "fields": [_serialize_field(field) for field in fields],
    })


@router.patch("/forms/{form_id}", dependencies=[Depends(require_entity_staff)])
async def update_form(
    form_id: str,
    payload: DynamicFormUpdate,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to update this form.")
    data = payload.model_dump(exclude_none=True)
    if "title" in data:
        form.title = data["title"]
    if "description" in data:
        form.description = data["description"]
    if "fields" in data:
        await entity_service.replace_form_fields(session, form_id, data["fields"])
    await session.commit()
    return success_response({"form_id": form.form_id, "updated": True})


@router.post("/forms/{form_id}/publish", dependencies=[Depends(require_entity_staff)])
async def publish_form(
    form_id: str,
    payload: PublishFormRequest,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to publish this form.")
    form.is_active = payload.isActive
    await session.commit()
    return success_response({"form_id": form.form_id, "isActive": form.is_active})


@router.post("/forms/{form_id}/qr-code", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def generate_qr_code(
    form_id: str,
    base_url: str = "http://localhost:5173",
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage this QR code.")

    target_url = f"{base_url.rstrip('/')}/form/{form_id}"
    qr_image_data_uri = generate_qr_image(target_url)

    # Upsert — qr_codes.form_id has a UNIQUE constraint
    existing = await session.scalar(select(QrCode).where(QrCode.form_id == (UUID(form_id) if isinstance(form_id, str) else form_id)))
    if existing:
        existing.qr_code_data = target_url
        existing.qr_image_url = qr_image_data_uri
        await session.commit()
        await session.refresh(existing)
        return success_response({
            "qr_id": str(existing.qr_id),
            "qrCodeData": target_url,
            "qrImageUrl": qr_image_data_uri,
            "showWelcome": existing.show_welcome,
            "welcomeTitle": existing.welcome_title,
            "welcomeMessage": existing.welcome_message,
            "welcomeLogo": existing.welcome_logo,
        })

    qr = QrCode(form_id=form_id, qr_code_data=target_url, qr_image_url=qr_image_data_uri)
    session.add(qr)
    await session.commit()
    await session.refresh(qr)
    return success_response({
        "qr_id": str(qr.qr_id),
        "qrCodeData": target_url,
        "qrImageUrl": qr_image_data_uri,
        "showWelcome": qr.show_welcome,
        "welcomeTitle": qr.welcome_title,
        "welcomeMessage": qr.welcome_message,
        "welcomeLogo": qr.welcome_logo,
    })


@router.get("/forms/{form_id}/qr-code", dependencies=[Depends(require_entity_staff)])
async def get_qr_code(
    form_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this QR code.")

    qr = await session.scalar(select(QrCode).where(QrCode.form_id == UUID(form_id)))
    if qr is None:
        return success_response({"form_id": form_id, "qrImageUrl": None, "qrCodeData": None})
    return success_response({
        "form_id": form_id,
        "qr_id": str(qr.qr_id),
        "qrCodeData": qr.qr_code_data,
        "qrImageUrl": qr.qr_image_url,
        "showWelcome": qr.show_welcome,
        "welcomeTitle": qr.welcome_title,
        "welcomeMessage": qr.welcome_message,
        "welcomeLogo": qr.welcome_logo,
    })


@router.post("/forms/{form_id}/welcome", dependencies=[Depends(require_entity_staff)])
async def update_welcome_settings(
    form_id: str,
    payload: WelcomeUpdateRequest,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to update welcome settings for this form.")

    qr = await session.scalar(select(QrCode).where(QrCode.form_id == UUID(form_id)))
    if qr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR Code settings not found for this form. Please generate a QR code first.")
    
    qr.show_welcome = payload.showWelcome
    qr.welcome_title = payload.welcomeTitle
    qr.welcome_message = payload.welcomeMessage
    qr.welcome_logo = payload.welcomeLogo
    await session.commit()
    await session.refresh(qr)
    
    return success_response({
        "form_id": form_id,
        "showWelcome": qr.show_welcome,
        "welcomeTitle": qr.welcome_title,
        "welcomeMessage": qr.welcome_message,
        "welcomeLogo": qr.welcome_logo,
    })


@router.get("/forms/{form_id}/submissions", dependencies=[Depends(require_entity_staff)])
async def get_form_submissions(
    form_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    from app.models.customer import Customer
    from app.models.certificate import Certificate
    from app.models.form_field import FormField

    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view these submissions.")

    fields = (
        await session.execute(select(FormField).where(FormField.form_id == UUID(form_id)))
    ).scalars().all()
    
    submissions = await entity_service.list_form_submissions(session, form_id)
    result = []
    for s in submissions:
        customer = await session.get(Customer, s.customer_id)
        
        customer_name = customer.name if customer and customer.name else None
        if not customer_name and s.data:
            for field in fields:
                if "name" in field.label.lower():
                    customer_name = s.data.get(str(field.field_id))
                    if customer_name:
                        break
            if not customer_name:
                customer_name = "Unnamed Customer"

        cert = await session.scalar(select(Certificate).where(Certificate.submission_id == s.submission_id))
        result.append({
            "submission_id": str(s.submission_id),
            "form_id": str(s.form_id),
            "customer_id": str(s.customer_id),
            "unique_id": customer.unique_id if customer else None,
            "customer_name": customer_name,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "data": s.data,
            "certificate": {
                "certificate_id": str(cert.certificate_id),
                "pdf_url": cert.pdf_url,
                "issue_date": cert.issue_date.isoformat() if cert.issue_date else None,
                "status": cert.status
            } if cert else None
        })
    return success_response(result)


@router.get("/submissions/{submission_id}", dependencies=[Depends(require_entity_staff)])
async def get_submission(
    submission_id: str,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    submission = await session.get(FormSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    form = await session.get(DynamicForm, submission.form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found for this submission.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this submission.")
    fields = (await session.execute(select(FormField).where(FormField.form_id == submission.form_id))).scalars().all()
    return success_response({"submission": submission, "fields": fields})


@router.post("/submissions/{submission_id}/certificate", dependencies=[Depends(require_entity_staff)], status_code=status.HTTP_201_CREATED)
async def generate_certificate(
    submission_id: str,
    payload: CertificateCreate,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff),
) -> dict:
    from app.models.certificate import Certificate

    submission = await session.get(FormSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    form = await session.get(DynamicForm, submission.form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found for this submission.")
    if not _can_access_entity(actor, str(form.entity_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to issue this certificate.")

    existing = await session.scalar(select(Certificate).where(Certificate.submission_id == submission_id))
    if existing:
        existing.pdf_url = payload.pdfUrl
        await session.commit()
        return success_response({"submission_id": submission_id, "pdfUrl": payload.pdfUrl, "updated": True})

    certificate = Certificate(submission_id=submission_id, pdf_url=payload.pdfUrl, status="ISSUED")
    session.add(certificate)
    await session.commit()
    return success_response({"submission_id": submission_id, "pdfUrl": payload.pdfUrl, "created": True})


@router.post("/submissions/{submission_id}/notify", dependencies=[Depends(require_entity_staff)])
async def notify_submission_customer(submission_id: str) -> dict:
    return success_response({"submission_id": submission_id, "notified": True})


@router.get("/customers", dependencies=[Depends(require_entity_staff)])
async def get_entity_customers(
    entity_id: str | None = None,
    session: AsyncSession = Depends(get_db),
    actor: dict = Depends(require_entity_staff)
) -> dict:
    target_entity_id = entity_id if actor.get("role") == "ADMIN" else actor.get("entity_id")
    if not target_entity_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entity ID is required.")

    from app.models.customer import Customer
    stmt = select(Customer).where(Customer.entity_id == target_entity_id, Customer.status == "ACTIVE").order_by(Customer.created_at.desc())
    customers = (await session.execute(stmt)).scalars().all()
    
    result = [
        {
            "customer_id": str(c.customer_id),
            "entity_id": str(c.entity_id),
            "unique_id": c.unique_id,
            "name": c.name or "Unnamed Customer",
            "phone": c.phone,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in customers
    ]
    return success_response(result)


@router.delete("/forms/{form_id}", dependencies=[Depends(require_entity_staff)])
async def delete_form(form_id: UUID, session: AsyncSession = Depends(get_db), actor: dict = Depends(require_entity_staff)) -> dict:
    form = await session.get(DynamicForm, form_id)
    if form is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No form found with this ID.")

    if actor.get("role") != "ADMIN" and str(form.entity_id) != actor.get("entity_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this form.")

    await session.delete(form)
    await session.commit()
    return success_response({"message": "Form and all associated QR codes, submissions, and certificates have been permanently deleted."})
