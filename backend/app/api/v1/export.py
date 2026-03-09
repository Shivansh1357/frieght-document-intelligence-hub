"""Export endpoints for documents and extracted data."""

import csv
import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import DbDep, OrgIdDep
from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.line_item import LineItem

router = APIRouter()


HEADER_FIELDS = [
    "file_name",
    "document_type",
    "status",
    "uploaded_at",
    "invoice_number",
    "document_date",
    "shipper_name",
    "shipper_address",
    "consignee_name",
    "consignee_address",
    "vessel_name",
    "voyage_number",
    "mbl_number",
    "hbl_number",
    "port_of_lading",
    "port_of_discharge",
    "country_of_origin",
    "country_of_destination",
    "incoterms",
    "payment_terms",
    "total_declared_value",
    "currency",
    "total_gross_weight",
    "total_net_weight",
    "weight_unit",
    "total_packages",
    "package_type",
    "overall_confidence",
]


@router.get("/documents/csv")
async def export_documents_csv(
    db: DbDep,
    org_id: OrgIdDep,
):
    """Export all documents with extracted data as CSV."""
    query = (
        select(Document)
        .where(Document.org_id == org_id, Document.is_deleted.is_(False))
        .options(selectinload(Document.extracted_data))
        .order_by(Document.uploaded_at.desc())
    )
    result = await db.execute(query)
    documents = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(HEADER_FIELDS)

    for doc in documents:
        row = [
            doc.file_name,
            doc.document_type,
            doc.status,
            str(doc.uploaded_at) if doc.uploaded_at else "",
        ]
        ed = doc.extracted_data
        if ed:
            row.extend([
                ed.invoice_number or "",
                ed.document_date or "",
                ed.shipper_name or "",
                ed.shipper_address or "",
                ed.consignee_name or "",
                ed.consignee_address or "",
                ed.vessel_name or "",
                ed.voyage_number or "",
                ed.mbl_number or "",
                ed.hbl_number or "",
                ed.port_of_lading or "",
                ed.port_of_discharge or "",
                ed.country_of_origin or "",
                ed.country_of_destination or "",
                ed.incoterms or "",
                ed.payment_terms or "",
                str(ed.total_declared_value) if ed.total_declared_value else "",
                ed.currency or "",
                str(ed.total_gross_weight) if ed.total_gross_weight else "",
                str(ed.total_net_weight) if ed.total_net_weight else "",
                ed.weight_unit or "",
                str(ed.total_packages) if ed.total_packages else "",
                ed.package_type or "",
                str(ed.overall_confidence) if ed.overall_confidence else "",
            ])
        else:
            row.extend([""] * (len(HEADER_FIELDS) - 4))

        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=freight_documents_export.csv"},
    )


LINE_ITEM_FIELDS = [
    "file_name",
    "invoice_number",
    "line_number",
    "item_number",
    "description",
    "hs_code",
    "quantity",
    "unit",
    "unit_price",
    "total_amount",
    "currency",
    "net_weight",
    "gross_weight",
    "weight_unit",
    "package_count",
    "container_number",
    "po_number",
    "confidence",
]


@router.get("/documents/{document_id}/csv")
async def export_document_csv(
    document_id: str,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Export a single document's line items as CSV."""
    query = (
        select(Document)
        .where(
            Document.id == document_id,
            Document.org_id == org_id,
            Document.is_deleted.is_(False),
        )
        .options(
            selectinload(Document.extracted_data).selectinload(
                ExtractedData.line_items
            )
        )
    )
    result = await db.execute(query)
    doc = result.scalars().first()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(LINE_ITEM_FIELDS)

    if doc and doc.extracted_data and doc.extracted_data.line_items:
        for item in doc.extracted_data.line_items:
            writer.writerow([
                doc.file_name,
                doc.extracted_data.invoice_number or "",
                item.line_number,
                item.item_number or "",
                item.description or "",
                item.hs_code or "",
                str(item.quantity) if item.quantity else "",
                item.unit or "",
                str(item.unit_price) if item.unit_price else "",
                str(item.total_amount) if item.total_amount else "",
                item.currency or "",
                str(item.net_weight) if item.net_weight else "",
                str(item.gross_weight) if item.gross_weight else "",
                item.weight_unit or "",
                str(item.package_count) if item.package_count else "",
                item.container_number or "",
                item.po_number or "",
                str(item.confidence) if item.confidence else "",
            ])

    output.seek(0)
    filename = f"{doc.file_name.rsplit('.', 1)[0]}_line_items.csv" if doc else "export.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
