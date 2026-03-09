-- Seed realistic extracted data for all 3 demo documents
-- Based on actual content from the sample PDFs

-- IDs
-- Doc 1: aeed0650-16ee-4fd4-a46f-5a6169d16723 (Haixing Hemco - Commercial Invoice + Packing List)
-- Doc 2: 33c80d40-f27c-40c5-bb4b-e18c1e224120 (Paramount Impex PI1693 - Sample Invoice + Packing List)
-- Doc 3: 0fec9081-7c15-4130-9475-52fc8389bc4d (Paramount Impex PI1694 - Sample Invoice + Packing List)

-- Org ID
-- 00000000-0000-0000-0000-000000000001

BEGIN;

-- Update document statuses
UPDATE documents SET status = 'extracted', processed_at = NOW(), document_type = 'combined'
WHERE id = 'aeed0650-16ee-4fd4-a46f-5a6169d16723';

UPDATE documents SET status = 'extracted', processed_at = NOW(), document_type = 'combined'
WHERE id = '33c80d40-f27c-40c5-bb4b-e18c1e224120';

UPDATE documents SET status = 'reviewed', processed_at = NOW(), document_type = 'combined'
WHERE id = '0fec9081-7c15-4130-9475-52fc8389bc4d';

-- ============================================================
-- DOCUMENT 1: Haixing Hemco Auto Parts - Invoice 25HE5130032
-- ============================================================
INSERT INTO extracted_data (
    id, document_id, org_id,
    shipper_name, shipper_address, consignee_name, consignee_address,
    vessel_name, voyage_number, mbl_number, hbl_number,
    port_of_lading, port_of_discharge,
    country_of_origin, country_of_destination,
    incoterms, payment_terms,
    total_declared_value, currency,
    total_gross_weight, total_net_weight, weight_unit,
    total_packages, package_type,
    document_date, invoice_number,
    reference_numbers, container_numbers,
    overall_confidence, extraction_model, extraction_duration_ms,
    created_at, updated_at
) VALUES (
    'a0000001-0000-0000-0000-000000000001',
    'aeed0650-16ee-4fd4-a46f-5a6169d16723',
    '00000000-0000-0000-0000-000000000001',
    'HAIXING HEMCO AUTO PARTS CO., LTD.',
    'HAIZHENG ROAD SOUTH XINGSHUN STREET WEST, HAIXING COUNTY, CANGZHOU CITY, HEBEI PROVINCE, CHINA P.C.: 061200',
    'CARRY-ON TRAILER INC',
    '931 INDUSTRIAL BLVD, MEXIA, TX 76667',
    'AS CHRISTIANA V.25023E', NULL,
    'ONEYTS5NU0659800', 'TJ25060005',
    'XINGANG', 'HOUSTON',
    'China', 'United States',
    'FOB XINGANG TIANJIN', '100% by T/T at 10 days AFTER SIGHT DOCUMENT',
    50487.00, 'USD',
    41250.000, 40161.680, 'kg',
    10980, 'Pkg',
    '2025-06-10', '25HE5130032',
    ARRAY['54290/COTX-3289149-252969', '54291/COTX-3289150-252970'],
    ARRAY['ONEU3046932/CN78769AQ', 'ONEU2123274/CN78880AQ'],
    92.50, 'claude-sonnet-4-5-20250929', 4523,
    NOW(), NOW()
);

-- Line items for Doc 1 (Container 1: ONEU3046932)
INSERT INTO line_items (id, extracted_data_id, org_id, line_number, item_number, description, quantity, unit, unit_price, total_amount, currency, net_weight, gross_weight, weight_unit, package_count, pallet_count, container_number, po_number, confidence, created_at)
VALUES
('b0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'WE-3-2', 'Leaf Spring', 3600, 'Pcs', 3.4500, 12420.00, 'USD', 10059.620, 10368.000, 'kg', 3600, 6, 'ONEU3046932/CN78769AQ', '54290/COTX-3289149-252969', 95.00, NOW()),
('b0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2, 'SW-3', 'Leaf Spring', 1440, 'Pcs', 5.9200, 8524.80, 'USD', 6708.620, 6768.000, 'kg', 1440, 4, 'ONEU3046932/CN78769AQ', '54290/COTX-3289149-252969', 95.00, NOW()),
('b0000001-0003-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 3, 'PR5', 'Leaf Spring', 240, 'Pcs', 8.8200, 2116.80, 'USD', 1636.800, 1704.000, 'kg', 240, 1, 'ONEU3046932/CN78769AQ', '54290/COTX-3289149-252969', 94.00, NOW()),
('b0000001-0004-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 4, 'E-5226', 'Leaf Spring', 210, 'Pcs', 10.3900, 2181.90, 'USD', 1675.800, 1785.000, 'kg', 210, 1, 'ONEU3046932/CN78769AQ', '54290/COTX-3289149-252969', 93.00, NOW()),
-- Container 2: ONEU2123274
('b0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5, 'WE-3-2', 'Leaf Spring', 3600, 'Pcs', 3.4500, 12420.00, 'USD', 10059.620, 10368.000, 'kg', 3600, 6, 'ONEU2123274/CN78880AQ', '54291/COTX-3289150-252970', 95.00, NOW()),
('b0000001-0006-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 6, 'SW-3', 'Leaf Spring', 1440, 'Pcs', 5.9200, 8524.80, 'USD', 6708.620, 6768.000, 'kg', 1440, 4, 'ONEU2123274/CN78880AQ', '54291/COTX-3289150-252970', 95.00, NOW()),
('b0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 7, 'PR5', 'Leaf Spring', 240, 'Pcs', 8.8200, 2116.80, 'USD', 1636.800, 1704.000, 'kg', 240, 1, 'ONEU2123274/CN78880AQ', '54291/COTX-3289150-252970', 94.00, NOW()),
('b0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 8, 'E-5226', 'Leaf Spring', 210, 'Pcs', 10.3900, 2181.90, 'USD', 1675.800, 1785.000, 'kg', 210, 1, 'ONEU2123274/CN78880AQ', '54291/COTX-3289150-252970', 93.00, NOW());

-- Extraction fields for Doc 1
INSERT INTO extraction_fields (id, extracted_data_id, field_name, field_value, confidence_score, created_at)
VALUES
('c0000001-0001-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'shipper_name', 'HAIXING HEMCO AUTO PARTS CO., LTD.', 98.00, NOW()),
('c0000001-0002-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'consignee_name', 'CARRY-ON TRAILER INC', 97.00, NOW()),
('c0000001-0003-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'invoice_number', '25HE5130032', 99.00, NOW()),
('c0000001-0004-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'document_date', '2025-06-10', 96.00, NOW()),
('c0000001-0005-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'vessel_name', 'AS CHRISTIANA V.25023E', 91.00, NOW()),
('c0000001-0006-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'mbl_number', 'ONEYTS5NU0659800', 94.00, NOW()),
('c0000001-0007-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'hbl_number', 'TJ25060005', 95.00, NOW()),
('c0000001-0008-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'port_of_lading', 'XINGANG', 97.00, NOW()),
('c0000001-0009-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'port_of_discharge', 'HOUSTON', 98.00, NOW()),
('c0000001-0010-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'country_of_origin', 'China', 99.00, NOW()),
('c0000001-0011-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'country_of_destination', 'United States', 85.00, NOW()),
('c0000001-0012-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'incoterms', 'FOB XINGANG TIANJIN', 93.00, NOW()),
('c0000001-0013-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'payment_terms', '100% by T/T at 10 days AFTER SIGHT DOCUMENT', 88.00, NOW()),
('c0000001-0014-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'total_declared_value', '50487.00', 96.00, NOW()),
('c0000001-0015-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'currency', 'USD', 99.00, NOW()),
('c0000001-0016-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'total_gross_weight', '41250.000', 94.00, NOW()),
('c0000001-0017-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'total_net_weight', '40161.680', 93.00, NOW()),
('c0000001-0018-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'total_packages', '10980', 90.00, NOW()),
('c0000001-0019-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'shipper_address', 'HAIZHENG ROAD SOUTH XINGSHUN STREET WEST, HAIXING COUNTY, CANGZHOU CITY, HEBEI PROVINCE, CHINA P.C.: 061200', 92.00, NOW()),
('c0000001-0020-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'consignee_address', '931 INDUSTRIAL BLVD, MEXIA, TX 76667', 96.00, NOW());


-- ============================================================
-- DOCUMENT 2: Paramount Impex PI1693 (PJ Trailer)
-- ============================================================
INSERT INTO extracted_data (
    id, document_id, org_id,
    shipper_name, shipper_address, consignee_name, consignee_address,
    vessel_name, voyage_number, mbl_number, hbl_number,
    port_of_lading, port_of_discharge,
    country_of_origin, country_of_destination,
    incoterms, payment_terms,
    total_declared_value, currency,
    total_gross_weight, total_net_weight, weight_unit,
    total_packages, package_type,
    document_date, invoice_number,
    reference_numbers, container_numbers,
    overall_confidence, extraction_model, extraction_duration_ms,
    created_at, updated_at
) VALUES (
    'a0000002-0000-0000-0000-000000000001',
    '33c80d40-f27c-40c5-bb4b-e18c1e224120',
    '00000000-0000-0000-0000-000000000001',
    'M/S PARAMOUNT IMPEX',
    'D-202-203, PHASE-VI, FOCAL POINT, LUDHIANA - 141010, INDIA. TEL: +91-161-2670376',
    'M/S PJ TRAILER',
    'KIND ATTN. JOHN TERRELL, 950 I-30, Mt Pleasant, TX 75455, VIA DALLAS AIRPORT',
    NULL, NULL,
    NULL, NULL,
    NULL, 'U.S.A.',
    'India', 'U.S.A.',
    NULL, 'SAMPLES ONLY, NOT FOR SALE',
    120.23, 'USD',
    39.070, 31.248, 'kg',
    6, 'PKGS',
    '2025-07-22', '1693',
    ARRAY['PAN NO.AAEFP3160G', 'IEC NO.3000009949', 'GSTIN: 03AAEFP3160G1ZO'],
    NULL,
    87.30, 'claude-sonnet-4-5-20250929', 3891,
    NOW(), NOW()
);

-- Line items for Doc 2
INSERT INTO line_items (id, extracted_data_id, org_id, line_number, item_number, description, hs_code, quantity, unit, unit_price, total_amount, currency, net_weight, gross_weight, weight_unit, package_count, confidence, created_at)
VALUES
('b0000002-0001-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, '7950508', 'JACK FOOT, 1.7" HEIGHT, ZINC', '84254200', 2, 'Pcs', 3.5800, 7.16, 'USD', 1.520, 1.794, 'kg', 1, 88.00, NOW()),
('b0000002-0002-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2, '7950130', 'Male mating pipe(inside pipe), 2" OD, 5/8" pin hole', '73269099', 2, 'Pcs', 1.4400, 2.87, 'USD', 0.610, 0.714, 'kg', 1, 85.00, NOW()),
('b0000002-0003-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 3, '7950501', 'A-FRAME JACK TOP WIND ZINC 2000#', '84254200', 2, 'Pcs', 17.0000, 34.00, 'USD', 8.032, 9.928, 'kg', 1, 92.00, NOW()),
('b0000002-0004-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 4, '7950497', 'A-FRAME JACK TOP WIND BLACK 2000#', '84254200', 2, 'Pcs', 17.2000, 34.40, 'USD', 8.176, 9.834, 'kg', 1, 91.00, NOW()),
('b0000002-0005-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5, '11980T', 'BOLT-ON MARINE SWIVEL JACK, 1000# CAPACITY 6" CASTER WHEEL, ZINC', '84254200', 2, 'Pcs', 19.5000, 39.00, 'USD', 12.292, 16.018, 'kg', 1, 89.00, NOW()),
('b0000002-0006-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 6, '7950244', 'JACK FOOT WITH HARDWARE', '84254200', 2, 'Pcs', 1.4000, 2.80, 'USD', 0.618, 0.782, 'kg', 1, 87.00, NOW());

-- Extraction fields for Doc 2
INSERT INTO extraction_fields (id, extracted_data_id, field_name, field_value, confidence_score, created_at)
VALUES
('c0000002-0001-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'shipper_name', 'M/S PARAMOUNT IMPEX', 95.00, NOW()),
('c0000002-0002-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'consignee_name', 'M/S PJ TRAILER', 93.00, NOW()),
('c0000002-0003-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'invoice_number', '1693', 97.00, NOW()),
('c0000002-0004-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'document_date', '2025-07-22', 94.00, NOW()),
('c0000002-0005-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'country_of_origin', 'India', 98.00, NOW()),
('c0000002-0006-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'country_of_destination', 'U.S.A.', 97.00, NOW()),
('c0000002-0007-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'total_declared_value', '120.23', 91.00, NOW()),
('c0000002-0008-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'currency', 'USD', 99.00, NOW()),
('c0000002-0009-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'total_gross_weight', '39.070', 90.00, NOW()),
('c0000002-0010-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'total_net_weight', '31.248', 90.00, NOW()),
('c0000002-0011-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'total_packages', '6', 96.00, NOW()),
('c0000002-0012-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'payment_terms', 'SAMPLES ONLY, NOT FOR SALE', 82.00, NOW()),
('c0000002-0013-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'port_of_discharge', 'U.S.A.', 75.00, NOW()),
('c0000002-0014-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'shipper_address', 'D-202-203, PHASE-VI, FOCAL POINT, LUDHIANA - 141010, INDIA', 91.00, NOW()),
('c0000002-0015-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'consignee_address', '950 I-30, Mt Pleasant, TX 75455, VIA DALLAS AIRPORT', 89.00, NOW()),
('c0000002-0016-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'incoterms', NULL, 40.00, NOW()),
('c0000002-0017-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'vessel_name', NULL, 30.00, NOW());


-- ============================================================
-- DOCUMENT 3: Paramount Impex PI1694 (Big Tax Trailer)
-- ============================================================
INSERT INTO extracted_data (
    id, document_id, org_id,
    shipper_name, shipper_address, consignee_name, consignee_address,
    vessel_name, voyage_number, mbl_number, hbl_number,
    port_of_lading, port_of_discharge,
    country_of_origin, country_of_destination,
    incoterms, payment_terms,
    total_declared_value, currency,
    total_gross_weight, total_net_weight, weight_unit,
    total_packages, package_type,
    document_date, invoice_number,
    reference_numbers, container_numbers,
    overall_confidence, extraction_model, extraction_duration_ms,
    created_at, updated_at
) VALUES (
    'a0000003-0000-0000-0000-000000000001',
    '0fec9081-7c15-4130-9475-52fc8389bc4d',
    '00000000-0000-0000-0000-000000000001',
    'M/S PARAMOUNT IMPEX',
    'D-202-203, PHASE-VI, FOCAL POINT, LUDHIANA - 141010, INDIA. TEL: +91-161-2670376',
    'M/S BIG TAX TRAILER',
    'KIND ATTN. JOHN TERRELL, 950 I-30, Mt Pleasant, TX 75455, VIA DALLAS AIRPORT',
    NULL, NULL,
    NULL, NULL,
    NULL, 'U.S.A.',
    'India', 'U.S.A.',
    NULL, 'SAMPLES ONLY, NOT FOR SALE',
    120.23, 'USD',
    39.070, 31.248, 'kg',
    6, 'PKGS',
    '2025-07-22', '1694',
    ARRAY['PAN NO.AAEFP3160G', 'IEC NO.3000009949', 'GSTIN: 03AAEFP3160G1ZO'],
    NULL,
    89.10, 'claude-sonnet-4-5-20250929', 4102,
    NOW(), NOW()
);

-- Line items for Doc 3 (same products, different consignee)
INSERT INTO line_items (id, extracted_data_id, org_id, line_number, item_number, description, hs_code, quantity, unit, unit_price, total_amount, currency, net_weight, gross_weight, weight_unit, package_count, confidence, created_at)
VALUES
('b0000003-0001-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, '7950508', 'JACK FOOT, 1.7" HEIGHT, ZINC', '84254200', 2, 'Pcs', 3.5800, 7.16, 'USD', 1.520, 1.794, 'kg', 1, 90.00, NOW()),
('b0000003-0002-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2, '7950130', 'Male mating pipe(inside pipe), 2" OD, 5/8" pin hole', '73269099', 2, 'Pcs', 1.4400, 2.87, 'USD', 0.610, 0.714, 'kg', 1, 86.00, NOW()),
('b0000003-0003-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 3, '7950501', 'A-FRAME JACK TOP WIND ZINC 2000#', '84254200', 2, 'Pcs', 17.0000, 34.00, 'USD', 8.032, 9.928, 'kg', 1, 93.00, NOW()),
('b0000003-0004-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 4, '7950497', 'A-FRAME JACK TOP WIND BLACK 2000#', '84254200', 2, 'Pcs', 17.2000, 34.40, 'USD', 8.176, 9.834, 'kg', 1, 92.00, NOW()),
('b0000003-0005-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5, '11980T', 'BOLT-ON MARINE SWIVEL JACK, 1000# CAPACITY 6" CASTER WHEEL, ZINC', '84254200', 2, 'Pcs', 19.5000, 39.00, 'USD', 12.292, 16.018, 'kg', 1, 88.00, NOW()),
('b0000003-0006-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 6, '7950244', 'JACK FOOT WITH HARDWARE', '84254200', 2, 'Pcs', 1.4000, 2.80, 'USD', 0.618, 0.782, 'kg', 1, 86.00, NOW());

-- Extraction fields for Doc 3
INSERT INTO extraction_fields (id, extracted_data_id, field_name, field_value, confidence_score, created_at)
VALUES
('c0000003-0001-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'shipper_name', 'M/S PARAMOUNT IMPEX', 96.00, NOW()),
('c0000003-0002-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'consignee_name', 'M/S BIG TAX TRAILER', 88.00, NOW()),
('c0000003-0003-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'invoice_number', '1694', 98.00, NOW()),
('c0000003-0004-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'document_date', '2025-07-22', 95.00, NOW()),
('c0000003-0005-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'country_of_origin', 'India', 99.00, NOW()),
('c0000003-0006-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'country_of_destination', 'U.S.A.', 98.00, NOW()),
('c0000003-0007-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'total_declared_value', '120.23', 92.00, NOW()),
('c0000003-0008-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'currency', 'USD', 99.00, NOW()),
('c0000003-0009-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'total_gross_weight', '39.070', 91.00, NOW()),
('c0000003-0010-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'total_net_weight', '31.248', 91.00, NOW()),
('c0000003-0011-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'total_packages', '6', 97.00, NOW()),
('c0000003-0012-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'payment_terms', 'SAMPLES ONLY, NOT FOR SALE', 83.00, NOW()),
('c0000003-0013-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'port_of_discharge', 'U.S.A.', 76.00, NOW()),
('c0000003-0014-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'shipper_address', 'D-202-203, PHASE-VI, FOCAL POINT, LUDHIANA - 141010, INDIA', 92.00, NOW()),
('c0000003-0015-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'consignee_address', '950 I-30, Mt Pleasant, TX 75455, VIA DALLAS AIRPORT', 90.00, NOW()),
('c0000003-0016-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'incoterms', NULL, 35.00, NOW()),
('c0000003-0017-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'vessel_name', NULL, 25.00, NOW());


-- ============================================================
-- SAMPLE CORRECTIONS (to demo audit trail & analytics)
-- ============================================================

-- Correction on Doc 3: consignee was misread as "BIG TAX" instead of "BIG TEX"
INSERT INTO field_corrections (id, document_id, org_id, field_name, original_value, corrected_value, corrected_by, corrected_at, correction_reason)
VALUES (
    'd0000001-0001-0000-0000-000000000001',
    '0fec9081-7c15-4130-9475-52fc8389bc4d',
    '00000000-0000-0000-0000-000000000001',
    'consignee_name',
    'M/S BIG TAX TRAILER',
    'M/S BIG TEX TRAILER',
    'reviewer@aulintri.com',
    NOW() - INTERVAL '2 hours',
    'ai_error'
);

-- Also update the extracted data to reflect the correction
UPDATE extracted_data SET consignee_name = 'M/S BIG TEX TRAILER' WHERE id = 'a0000003-0000-0000-0000-000000000001';

-- Correction on Doc 2: payment_terms clarification
INSERT INTO field_corrections (id, document_id, org_id, field_name, original_value, corrected_value, corrected_by, corrected_at, correction_reason)
VALUES (
    'd0000001-0002-0000-0000-000000000001',
    '33c80d40-f27c-40c5-bb4b-e18c1e224120',
    '00000000-0000-0000-0000-000000000001',
    'payment_terms',
    'SAMPLES ONLY, NOT FOR SALE',
    'FREE OF COST - SAMPLES ONLY, NOT FOR SALE',
    'reviewer@aulintri.com',
    NOW() - INTERVAL '1 hour',
    'incomplete'
);

-- Correction on Doc 1: vessel name refinement
INSERT INTO field_corrections (id, document_id, org_id, field_name, original_value, corrected_value, corrected_by, corrected_at, correction_reason)
VALUES (
    'd0000001-0003-0000-0000-000000000001',
    'aeed0650-16ee-4fd4-a46f-5a6169d16723',
    '00000000-0000-0000-0000-000000000001',
    'vessel_name',
    'AS CHRISTIANA V.25023E',
    'AS CHRISTIANA V.25023E (Voyage 25023E)',
    'reviewer@aulintri.com',
    NOW() - INTERVAL '30 minutes',
    'formatting'
);

COMMIT;
