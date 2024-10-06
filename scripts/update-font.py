import os
import sys
import zipfile
import shutil
import glob
from datetime import datetime

TMP_PATH = "/tmp/fontello"

def get_latest_fontello_zip(download_folder):
  files = [os.path.join(download_folder, f) for f in os.listdir(download_folder) if f.startswith('fontello-') and f.endswith('.zip')]
  if not files:
    print("No 'fontello-' files found.")
    return None
  latest_file = max(files, key=os.path.getctime)
  return latest_file

def unzip_file(folder_path, file_path, extract_to=TMP_PATH):
  with zipfile.ZipFile(os.path.join(folder_path, file_path), 'r') as zip_ref:
    zip_ref.extractall(extract_to)
  print(f"File unzipped : {file_path}")

def copy_files():
  fontello_font_dir = os.path.join(TMP_PATH, "fontello-*/font")
  destination_dir = os.path.join(os.getcwd(), "src/font")

  if not os.path.exists(destination_dir):
    os.makedirs(destination_dir)

  for font_file in glob.glob(os.path.join(fontello_font_dir, "*")):
    shutil.copy(font_file, destination_dir)
    print(f"File copied : {font_file}")

if __name__ == "__main__":
  if len(sys.argv) < 2:
    print("Please specify download folder where fontello fonts are stored.")
    sys.exit(1)

  latest_zip = get_latest_fontello_zip(sys.argv[1])
  if latest_zip:
    unzip_file(sys.argv[1], latest_zip)
    copy_files()
    
  shutil.rmtree(TMP_PATH)
  print(f"The temporary folder {TMP_PATH} has been deleted.")