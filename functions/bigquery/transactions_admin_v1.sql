-- Admin transaction projection.
-- Production deploy:
-- bq query --use_legacy_sql=false < functions/bigquery/transactions_admin_v1.sql
CREATE OR REPLACE VIEW `reelx-backend.firestore_export.transactions_admin_v1` AS
SELECT
  document_id AS id,
  timestamp AS export_timestamp,
  COALESCE(
    TIMESTAMP_MICROS(
      SAFE_CAST(JSON_VALUE(data, '$.createdAt._seconds') AS INT64) * 1000000
      + DIV(
        COALESCE(SAFE_CAST(JSON_VALUE(data, '$.createdAt._nanoseconds') AS INT64), 0),
        1000
      )
    ),
    SAFE_CAST(JSON_VALUE(data, '$.createdAt') AS TIMESTAMP),
    timestamp
  ) AS created_at,
  COALESCE(
    JSON_VALUE(data, '$.pin'),
    JSON_VALUE(data, '$.transactionId'),
    document_id
  ) AS transaction_id,
  COALESCE(JSON_VALUE(data, '$.vendorName'), 'Unknown Vendor') AS vendor_name,
  COALESCE(
    SAFE_CAST(JSON_VALUE(data, '$.totalAmount') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.amount') AS FLOAT64),
    0
  ) AS total_amount,
  COALESCE(JSON_VALUE(data, '$.type'), 'transaction') AS type,
  COALESCE(
    SAFE_CAST(JSON_VALUE(data, '$.cashbackAmount') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.cashback') AS FLOAT64)
  ) AS cashback_amount,
  SAFE_CAST(JSON_VALUE(data, '$.creatorCashbackAmount') AS FLOAT64) AS creator_cashback_amount,
  JSON_VALUE(data, '$.creatorCode') AS creator_code,
  JSON_VALUE(data, '$.creatorCodeOwnerId') AS creator_code_owner_id,
  JSON_VALUE(data, '$.creatorUid') AS creator_uid,
  SAFE_CAST(JSON_VALUE(data, '$.discountAmount') AS FLOAT64) AS discount_amount,
  JSON_VALUE(data, '$.discountCode') AS discount_code,
  JSON_VALUE(data, '$.discountType') AS discount_type,
  SAFE_CAST(JSON_VALUE(data, '$.discountValue') AS FLOAT64) AS discount_value,
  COALESCE(
    SAFE_CAST(JSON_VALUE(data, '$.finalAmount') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.totalAmount') AS FLOAT64),
    SAFE_CAST(JSON_VALUE(data, '$.amount') AS FLOAT64)
  ) AS final_amount,
  JSON_VALUE(data, '$.purchaseUrl') AS purchase_url,
  JSON_VALUE(data, '$.offerId') AS offer_id,
  JSON_VALUE(data, '$.pin') AS pin,
  JSON_VALUE(data, '$.userId') AS user_id,
  JSON_VALUE(data, '$.vendorId') AS vendor_id,
  SAFE_CAST(JSON_VALUE(data, '$.redemptionCardAmount') AS FLOAT64) AS redemption_card_amount,
  SAFE_CAST(JSON_VALUE(data, '$.remainingAmount') AS FLOAT64) AS remaining_amount
FROM `reelx-backend.firestore_export.transactions_raw_latest`;