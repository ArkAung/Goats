import keras
from keras.models import load_model
import numpy as np
from PIL import Image
import sys


def predict(model, input_image):
    predictions = model.predict(input_image)
    return predictions

def image_process(filename):
    im=Image.open(filename)
    im = im.resize((100,100),Image.ANTIALIAS)
    w, h = im.size
    cropped_image = im.crop((10, 10, w-10, h-10))
    numpy_arr = np.asarray(cropped_image)
    return numpy_arr

input_file = sys.argv[1]
model = load_model('melanoma.h5')
image = image_process(input_file)
image = np.reshape(image, (1,image.shape[0], image.shape[1], image.shape[2]))
prediction = predict(model, image)
percentage = np.max(prediction) * 100
pred_class = np.argmax(prediction)
if pred_class == 0:
    output_string = "Benign"
else:
    output_string = "Malignant"
    
print "From the looks of this patch of skin, it is {} with {}%".format(output_string,percentage)
