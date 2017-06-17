from PIL import Image
import glob
import numpy as np
import os


def image_process(filename):
    im=Image.open(filename)
    im = im.resize((100,100),Image.ANTIALIAS)
    w, h = im.size
    cropped_image = im.crop((10, 10, w-10, h-10))
    numpy_arr = np.asarray(cropped_image)
    return numpy_arr


path = '/work/aaung/ISIC-images/'
dir_list = []
for root, directories, files in os.walk(path):
    for directory in directories:
        dir_list.append(os.path.join(root, directory))

for dir in dir_list:
    filelist = glob.glob(dir + "*.jpg")
    x = np.array([image_process(fname) for fname in filelist])
    np.save('image.npy', x)