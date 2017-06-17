import json
import urllib

import numpy as np

total_image_count = 3000
limit = 100
results = []
names = []

for i in range(total_image_count / limit):
    current_offset = i * limit
    url = 'https://isic-archive.com/api/v1/image?limit=' + str(
        limit) + '&offset=' + str(
        current_offset) + '&sort=name&sortdir=1&filter=%7B%22operator%22%3A%22not+in%22%2C%22operands%22%3A%5B%7B%22identifier%22%3A%22folderId%22%2C%22type%22%3A%22objectid%22%7D%2C%5B%225627eefe9fc3c132be08d84c%22%2C%225627f5f69fc3c132be08d852%22%5D%5D%7D'

    response = urllib.urlopen(url)
    data = json.loads(response.read())

    print '==================================', url
    for j in range(len(data)):
        # print data[j]['_id'], data[j]['name']

        url2 = 'https://isic-archive.com/api/v1/image/' + data[j]['_id']
        response2 = urllib.urlopen(url2)
        data2 = json.loads(response2.read())

        if data2['meta']['clinical']['benign_malignant'] == 'benign':
            tmp = [1, 0]
        elif data2['meta']['clinical']['benign_malignant'] == 'malignant':
            tmp = [0, 1]
        else:
            tmp = [0, 0]
            print 'Error', data2['meta']['clinical']['benign_malignant'], data[j]['name'], url2

        results.append(tmp)
        names.append(data[j]['name'])

np.savez('labels.npz', labels=np.array(results), names=np.array(names))
