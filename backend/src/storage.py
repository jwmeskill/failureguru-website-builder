import os
import boto3

s3 = boto3.client("s3")


def upload_html_to_s3(key: str, html: str) -> str:
    """
    Uploads HTML to S3 and returns a public URL.
    For production, you likely want a CloudFront URL and private bucket.
    """
    bucket = os.environ.get("BUILDER_BUCKET")
    if not bucket:
        raise ValueError("Missing env var BUILDER_BUCKET")

    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=html.encode("utf-8"),
        ContentType="text/html",
    )

    # Basic S3 URL (works if bucket/object is public or behind CF with OAC)
    return f"https://{bucket}.s3.amazonaws.com/{key}"
