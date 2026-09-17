#!/usr/bin/env python3
"""Generate bag images per row in an input requirements CSV using Google AI Studio Developer API.

Creates a dedicated folder for each bag ID and generates 4 distinct perspective
images inside each ID directory.
"""

import csv
import os
import re
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

# Configure the Gemini Client for Developer API Mode
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
    sys.exit(1)

try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}", file=sys.stderr)
    sys.exit(1)

# Define the 4 required perspective views and prompt instructions
VIEWS = [
    ("1_front", "direct frontal view, centered, symmetrical composition, standing upright on a plain matte light grey surface, clean studio product photography"),
    ("2_side", "exact 90-degree side profile view, showing side panel and depth, standing upright on a plain matte light grey surface, clean studio product photography"),
    ("3_back", "direct back view, rear profile, standing upright on a plain matte light grey surface, clean studio product photography"),
    ("4_lifestyle", "full-length street style fashion shot of an elegant woman wearing and carrying the bag naturally outdoors")
]

ALIASES = {
    "id": ("id", "bag_id", "item_id", "row_id"),
    "brand": ("brand",),
    "model": ("model",),
    "color": ("color", "colour"),
    "material": ("material",),
    "size": ("size",),
    "hardware": ("hardware",),
}

def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()

def row_value(row: dict[str, str], canonical_name: str) -> str:
    lowered = {clean(key).lower(): clean(value) for key, value in row.items()}
    for alias in ALIASES[canonical_name]:
        if lowered.get(alias):
            return lowered[alias]
    return ""

def sanitize_folder_name(name: str) -> str:
    """Sanitize string to create valid folder names."""
    return re.sub(r'[\\/*?:"<>|]', "", str(name)).strip().replace(" ", "_")

def build_base_description(row: dict[str, str]) -> str:
    """Constructs a descriptive prompt base from CSV specs."""
    brand = row_value(row, "brand")
    model = row_value(row, "model")
    color = row_value(row, "color")
    material = row_value(row, "material")
    size = row_value(row, "size")
    hardware = row_value(row, "hardware")

    parts = []
    if size and size.lower() != "none": parts.append(size)
    if color and color.lower() != "none": parts.append(color)
    if material and material.lower() != "none": parts.append(material)
    if brand: parts.append(brand)
    if model: parts.append(model)
    
    desc = " ".join(parts) + " luxury handbag"
    if hardware and hardware.lower() != "none":
        desc += f" with {hardware} hardware"
        
    return clean(desc)

def generate_and_save_image(prompt: str, output_path: Path) -> bool:
    """Generates image using Developer API via generate_content response_modalities."""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-image',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="1:1"
                )
            )
        )

        image_saved = False
        for part in response.parts:
            if part.inline_data:
                # Extract and write the inline image data bytes directly
                image_bytes = part.inline_data.data
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                print(f"  [SUCCESS] Saved: {output_path}")
                image_saved = True
                break

        if not image_saved:
            print(f"  [FAILED] No image data returned for prompt: {prompt}")
            return False
            
        return True

    except Exception as exc:
        print(f"  [ERROR] Gemini generation failed: {exc}")
        return False

def process_csv(csv_filepath: Path, output_base_dir: Path = Path("generated_bags")):
    """Reads CSV, creates a folder for each bag ID, and generates the 4 images."""
    if not csv_filepath.exists():
        print(f"error: Input file '{csv_filepath}' not found.", file=sys.stderr)
        return

    output_base_dir.mkdir(parents=True, exist_ok=True)

    with csv_filepath.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        
        for index, row in enumerate(reader, start=1):
            bag_id = row_value(row, "id") or f"row_{index}"
            base_desc = build_base_description(row)

            folder_name = sanitize_folder_name(f"id_{bag_id}")
            id_folder = output_base_dir / folder_name
            id_folder.mkdir(parents=True, exist_ok=True)

            print(f"\n[{index}] Processing Bag ID '{bag_id}': {base_desc}")

            for view_key, view_prompt_suffix in VIEWS:
                full_prompt = (
                    f"High-end luxury product photography of a {base_desc}. "
                    f"Angle and setting: {view_prompt_suffix}. "
                    "Soft studio lighting, 8k resolution, crisp stitching detail, photorealistic."
                )
                
                output_file = id_folder / f"{view_key}.jpg"
                print(f" Generating {view_key} view...")
                
                generate_and_save_image(full_prompt, output_file)
                time.sleep(1) # Brief delay to manage API rate limits

if __name__ == "__main__":
    csv_file = Path("input-reqm.csv")
    if not csv_file.exists():
        csv_file = Path("input_reqm.csv")
        
    process_csv(csv_file)