import os
import boto3

s3 = boto3.client("s3")


def upload_html_to_s3(key: str, html: str) -> str:
    bucket = os.environ.get("BUILDER_BUCKET")
    if not bucket:
        raise ValueError("Missing env var BUILDER_BUCKET")

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
        CacheControl="no-cache, no-store, must-revalidate",
    )

    return f"https://{bucket}.s3.amazonaws.com/{key}"
