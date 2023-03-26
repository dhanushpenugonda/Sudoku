import joblib
from sklearn.neighbors import KNeighborsClassifier
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import cv2
import sys
import json
import ast

img = cv2.imread(sys.argv[1])
# img = cv2.imread("C:/Users/AKHIL/Documents/Games/Sudoku/numbers/sudoku-test-4.jpg")
model = joblib.load("knn.joblib")

heightImg = 729
widthImg  = 729

img = cv2.resize(img, (widthImg, heightImg))
img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
imgBlur = cv2.GaussianBlur(img, (5, 5), 1)
imgCanny = cv2.Canny(imgBlur,10,70)
kernel = np.ones((3, 3), np.uint8)

imgContours = img.copy()
contours, hierarchy = cv2.findContours(imgCanny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
def rectContour(contours):
    rectCon = []
    max_area = 0
    for i in contours:
        area = cv2.contourArea(i)
        if area > 50:
            peri = cv2.arcLength(i, True)
            approx = cv2.approxPolyDP(i, 0.02 * peri, True)
            if len(approx) == 4:
                rectCon.append(i)
    rectCon = sorted(rectCon, key=cv2.contourArea,reverse=True)
    return rectCon

def getCornerPoints(cont):
    peri = cv2.arcLength(cont, True)
    approx = cv2.approxPolyDP(cont, 0.02 * peri, True)
    return approx

rectCon = rectContour(contours)
for i in range(3):
    imgCanny = cv2.dilate(imgCanny, kernel, iterations=1)
    imgCanny = cv2.erode(imgCanny, kernel, iterations=1)
    contours, hierarchy = cv2.findContours(imgCanny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    rectCon += rectContour(contours)
imgRectCon = img.copy()
rectCon = sorted(rectCon, key=cv2.contourArea,reverse=True)
biggestPoints= getCornerPoints(rectCon[0])
def reorder(myPoints):

    myPoints = myPoints.reshape((4, 2))
    myPointsNew = np.zeros((4, 1, 2), np.int32)
    add = myPoints.sum(1)
    myPointsNew[0] = myPoints[np.argmin(add)]
    myPointsNew[3] =myPoints[np.argmax(add)]
    diff = np.diff(myPoints, axis=1)
    myPointsNew[1] =myPoints[np.argmin(diff)]
    myPointsNew[2] = myPoints[np.argmax(diff)]

    return myPointsNew


biggestPoints=reorder(biggestPoints)
imgBigContour = img.copy()
cv2.drawContours(imgBigContour, biggestPoints, -1, (0, 0, 0), 5)

pts1 = np.float32(biggestPoints)
pts2 = np.float32([[0, 0],[widthImg, 0], [0, heightImg],[widthImg, heightImg]])
matrix = cv2.getPerspectiveTransform(pts1, pts2)
imgWarp = cv2.warpPerspective(img, matrix, (widthImg, heightImg))
imgThresh = cv2.adaptiveThreshold(imgWarp, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 199, 5)
def splitBoxes(img):
    rows = np.vsplit(img,9)
    boxes=[]
    for r in rows:
        cols= np.hsplit(r,9)
        temp=[]
        for box in cols:
            temp.append(box)
        boxes.append(temp)
    return boxes
boxes = splitBoxes(imgThresh)

def processImage(img):
    def remove_grid_lines(image):
        output = cv2.connectedComponentsWithStats(image, 8, cv2.CV_32S)
        (numLabels, labels, stats, centroids) = output
        n = len(image)
        label_count = [0 for i in range(numLabels)]
        for i in range(n//3,2*n//3):
            for j in range(n//3,2*n//3):
                label_count[labels[i][j]]+=1
        x = label_count.index(max(label_count))
        maxi,y=0,-1
        for i in range(numLabels):
            if maxi<label_count[i] and label_count[i]<max(label_count):
                maxi=label_count[i]
                y=i
        for i in range(n):
            for j in range(n):
                if labels[i][j] != y and labels[i][j] != x and image[i][j] == 255:
                    image[i][j] = 0
                            
        return image
    def trim_borders(image):
        image = remove_grid_lines(image)
        imgCanny = cv2.Canny(image,10,70)
        contours, hierarchy = cv2.findContours(imgCanny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        maxi=0
        if len(contours)==0:
            return None
        for i in contours:
            if maxi < cv2.arcLength(i, True):
                cnt = i
                maxi = cv2.arcLength(i, True)
        x,y,w,h = cv2.boundingRect(cnt)
        crop = image[y:y+h,x:x+w]
        return crop
    trimmed = trim_borders(img)
    if trimmed is None:
        return None
    padded = np.pad(trimmed,(15,15), 'constant')
    n,m = padded.shape
    if n>m:
        left, right = (n-m)//2, n-m-(n-m)//2
        padded = cv2.copyMakeBorder(padded, 0, 0, left, right, cv2.BORDER_CONSTANT,value=(0,0,0))
    else:
        top, bottom = (m-n)//2, m-n-(m-n)//2
        padded = cv2.copyMakeBorder(padded, top, bottom, 0, 0, cv2.BORDER_CONSTANT,value=(0,0,0))
    img = cv2.resize(padded, (28, 28),interpolation = cv2.INTER_AREA)
    return img

def printer(a):
    if a is None:
        print("Invalid Sudoku!!")
        return
    print("-"*25)
    for i in range(9):
        print("|",end=" ")
        for j in range(9):
            if a[i][j]==0:
                print(" ",end=" ")
            else:
                print(a[i][j], end=" ")
            if j%3==2 and j!=8:
                print("|",end=" ")
        print("|")
        if i%3==2 and i!=8:
            print("|"+"-"*7+"+"+"-"*7+"+"+"-"*7+"|")
    print("-"*25)


table = [[0 for j in range(9)] for i in range(9)]
for i in range(9):
    for j in range(9):
        processed = processImage(boxes[i][j])
        if processed is not None:
            table[i][j] = model.predict([processed.flatten()])[0]

# plt.imshow(img)
# plt.show()


# print(json.dumps(table))
print(table)
# sys.stdout.flush()