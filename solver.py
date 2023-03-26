import copy
import sys
import json
import ast

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


def validnumbers(a,x,y):
    if(a[x][y]==0):
        b=[1,2,3,4,5,6,7,8,9]
        for i in range(9):
            if a[x][i] in b:
                b.remove(a[x][i])
            if a[i][y] in b:
                b.remove(a[i][y])
        for i in range(3):
            for j in range(3):
                if a[3*(x//3)+i][3*(y//3)+j] in b:
                    b.remove(a[3*(x//3)+i][3*(y//3)+j])
        return b
    else:
        return []

def solver(table,hints):
    def solved():
        for i in range(9):
            for j in range(9):
                if table[i][j]==0:
                    return True
        return False

    def removenumbers(val,x,y):
        for i in range(9):
            if val in hints[x][i] and i!=y:
                hints[x][i].remove(val)
            if val in hints[i][y] and i!=x:
                hints[i][y].remove(val)
        for i in range(3):
            for j in range(3):
                if val in hints[3*(x//3)+i][3*(y//3)+j] and 3*(x//3)+i!=x and 3*(y//3)+j!=y:
                    hints[3*(x//3)+i][3*(y//3)+j].remove(val)

    def findsingle():
        flag=False
        for i in range(9):
            for j in range(9):
                if len(hints[i][j])==1:
                    removenumbers(hints[i][j][0],i,j)
                    table[i][j]=hints[i][j][0]
                    hints[i][j]=[]
                    flag=True
        if flag:
            findsingle()
        else:
            return False

    def uniquenumber():
        flag=False
        for k in range(1,10):
            for i in range(9):
                count=0
                for j in range(9):
                    if k in hints[i][j]:
                        count+=1
                        x,y=i,j
                if count==1:
                    removenumbers(k,x,y)
                    table[x][y]=k
                    hints[x][y]=[]
                    flag=True
                count=0
                for j in range(9):
                    if k in hints[j][i]:
                        count+=1
                        x,y=j,i
                if count==1:
                    removenumbers(k,x,y)
                    table[x][y]=k
                    hints[x][y]=[]
                    flag=True
            
            for I in range(3):
                for J in range(3):
                    count=0
                    for i in range(3):
                        for j in range(3):
                            if k in hints[3*I+i][3*J+j]:
                                count+=1
                                x,y=3*I+i,3*J+j
                    if count==1:
                        removenumbers(k,x,y)
                        table[x][y]=k
                        hints[x][y]=[]
                        flag=True
        if flag:
            uniquenumber()
        else:
            return False
    
    def guess():
        x,y,z=-1,-1,10
        for i in range(9):
            for j in range(9):
                if len(hints[i][j])<z and len(hints[i][j])!=0:
                    x,y,z=i,j,len(hints[i][j])
        return [x,y]
    

    while solved():
        if findsingle()==False and uniquenumber()==False:
            break
    if solved()==False:
        return table
    x,y=guess()
    if x==-1 and y==-1:
        return
    for k in hints[x][y]:
        z=copy.deepcopy(hints)
        removenumbers(k,x,y)
        table[x][y]=k
        hints[x][y]=[]
        val=solver(table,hints)
        if val!=None:
            return val
        hints=z
        table[x][y]=0

def validity(board):
    def valid(a,x,y):
        if(a[x][y]!=0):
            for i in range(9):
                if a[x][i]==a[x][y] and i!=y:
                    # print(x,y,x,i)
                    return True
                if a[i][y]==a[x][y] and i!=x:
                    # print(x,y,i,y)
                    return True
            for i in range(3):
                for j in range(3):
                    if a[3*(x//3)+i][3*(y//3)+j]==a[x][y] and 3*(x//3)+i!=x and 3*(y//3)+j!=y:
                        # print(x,y,3*(x//3)+i,3*(y//3)+j)
                        return True
        return False   

    for i in range(9):
        for j in range(9):
            if valid(board,i,j):
                # print(i,j)
                return False
    return True 
table = ast.literal_eval(sys.argv[1])
# table=[[0, 3, 9, 1, 0, 0, 0, 0, 0],
# [4, 0, 8, 0, 6, 0, 0, 0, 2],
# [2, 0, 0, 5, 8, 0, 7, 0, 0],
# [8, 0, 0, 0, 0, 0, 0, 0, 0],
# [0, 2, 0, 0, 0, 9, 0, 0, 0],
# [3, 0, 6, 0, 0, 0, 0, 4, 9],
# [0, 0, 0, 0, 1, 0, 0, 3, 0],
# [0, 4, 0, 3, 0, 0, 0, 0, 8],
# [7, 0, 0, 0, 0, 0, 4, 0, 0]]
if validity(table):
    hints = {i: {j: [] for j in range(9)} for i in range(9)}
    for i in hints:
        for j in hints[i]:
            hints[i][j] = validnumbers(table,i,j)
    sol=solver(table,hints)
    print(json.dumps(sol))
else:
    print(json.dumps([]))
# printer(sol)