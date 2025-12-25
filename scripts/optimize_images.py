import os
from PIL import Image
import shutil

# Configuration
IMAGE_DIR = 'assets/images'
MAX_WIDTH = 1920  # Full HD is usually sufficient for web
QUALITY = 80      # Good balance between quality and size
TARGET_FORMAT = 'webp'

def optimize_images():
    # Ensure dependencies
    try:
        import PIL
    except ImportError:
        print("Pillow library not found. Please run: pip install Pillow")
        return

    print(f"Scanning {IMAGE_DIR} for images to optimize...")
    
    # Track converted files to update HTML later if needed
    conversions = {}
    
    for filename in os.listdir(IMAGE_DIR):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            filepath = os.path.join(IMAGE_DIR, filename)
            
            # Check file size (if > 500KB, it needs optimization)
            file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
            if file_size_mb < 0.5 and filename.lower().endswith('.webp'):
                print(f"Skipping {filename} (already small/optimized)")
                continue
                
            print(f"Processing {filename} ({file_size_mb:.2f} MB)...")
            
            try:
                with Image.open(filepath) as img:
                    # Convert RGBA to RGB if needed (for JPG output, but WebP supports transparency)
                    if img.mode in ('RGBA', 'LA') and TARGET_FORMAT == 'jpeg':
                        background = Image.new(img.mode[:-1], img.size, (255, 255, 255))
                        background.paste(img, img.split()[-1])
                        img = background.convert('RGB')
                    
                    # Resize if too large
                    width, height = img.size
                    if width > MAX_WIDTH:
                        new_height = int(height * (MAX_WIDTH / width))
                        img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
                        print(f"  Resized from {width}x{height} to {MAX_WIDTH}x{new_height}")
                    
                    # Save as WebP
                    new_filename = os.path.splitext(filename)[0] + '.webp'
                    new_filepath = os.path.join(IMAGE_DIR, new_filename)
                    
                    img.save(new_filepath, TARGET_FORMAT, quality=QUALITY, optimize=True)
                    
                    final_size_mb = os.path.getsize(new_filepath) / (1024 * 1024)
                    print(f"  Saved as {new_filename} ({final_size_mb:.2f} MB)")
                    
                    conversions[filename] = new_filename
                    
            except Exception as e:
                print(f"  Error processing {filename}: {e}")

    print("\noptimization complete!")
    print("Don't forget to update your HTML to point to the new .webp files if filenames changed.")
    
    # Optional: Automatically update index.html references?
    # For now, we just list the suggested changes
    if conversions:
        print("\nSuggested HTML updates:")
        for old, new in conversions.items():
            print(f"Replace '{old}' with '{new}'")

if __name__ == "__main__":
    optimize_images()
