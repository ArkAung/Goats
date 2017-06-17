from PIL import Image
import glob
import numpy as np


def image_process(filename):
    im=Image.open(filename)
    im = im.resize((100,100),Image.ANTIALIAS)
    w, h = im.size
    cropped_image = im.crop((10, 10, w-10, h-10))
    numpy_arr = np.asarray(cropped_image)
    return numpy_arr

filelist = glob.glob("ISIC_UDA-2_1/*.jpg")
x = np.array([image_process(fname) for fname in filelist])
np.save('ISIC_UDA-2_1.npy', x)