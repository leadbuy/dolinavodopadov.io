#!/usr/bin/env python3
import os
import shutil
import sys

def upload_images():
    """Помощник для загрузки изображений в папку hero-section"""
    
    images_dir = os.path.join('static', 'images', 'hero-section')
    
    # Создаем папку если ее нет
    os.makedirs(images_dir, exist_ok=True)
    
    print(f"Папка для изображений: {images_dir}")
    print("\nПоддерживаемые форматы: .jpg, .jpeg, .png, .webp")
    print("Поместите изображения в эту папку или укажите путь к ним.")
    
    if len(sys.argv) > 1:
        # Копируем файлы из указанного пути
        source_path = sys.argv[1]
        if os.path.exists(source_path):
            if os.path.isfile(source_path):
                # Это файл
                shutil.copy(source_path, images_dir)
                print(f"Файл скопирован: {os.path.basename(source_path)}")
            elif os.path.isdir(source_path):
                # Это папка
                for filename in os.listdir(source_path):
                    if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        src_file = os.path.join(source_path, filename)
                        dst_file = os.path.join(images_dir, filename)
                        shutil.copy(src_file, dst_file)
                        print(f"Файл скопирован: {filename}")
        else:
            print(f"Ошибка: путь не существует: {source_path}")
    else:
        print(f"\nТекущие изображения в папке {images_dir}:")
        images = [f for f in os.listdir(images_dir) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        
        if images:
            for img in images:
                print(f"  - {img}")
        else:
            print("  (папка пуста)")
        
        print("\nИспользование:")
        print("  python upload_images.py [путь_к_файлу_или_папке]")
        print("\nПримеры:")
        print("  python upload_images.py my_photo.jpg")
        print("  python upload_images.py ./photos/")

if __name__ == '__main__':
    upload_images()