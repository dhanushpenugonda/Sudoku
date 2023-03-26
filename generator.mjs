function fillValues(){
    fillDiagonal();
    fillRemaining(0, 3);
    removeKDigits();
}
function fillDiagonal(){

    for (var i = 0; i<9; i=i+3) fillBox(i, i);
}
function unUsedInBox(rowStart, colStart, num){
    for (var i = 0; i<3; i++)
        for (var j = 0; j<3; j++)
            if (mat[rowStart+i][colStart+j]==num)
                return false;

    return true;
}
function fillBox(row, col){
    var num;
    for (var i=0; i<3; i++)
    {
        for (var j=0; j<3; j++)
        {
            do
            {
                num = randomGenerator(9);
            }
            while (!unUsedInBox(row, col, num));

            mat[row+i][col+j] = num;
        }
    }
}
function randomGenerator(num){
    return Math.floor((Math.random()*num+1));
}
function CheckIfSafe(i, j, num)
{
    return (unUsedInRow(i, num) &&
            unUsedInCol(j, num) &&
            unUsedInBox(i-i%3, j-j%3, num));
}
function unUsedInRow(i, num){
    for (var j = 0; j<9; j++)
       if (mat[i][j] == num)
            return false;
    return true;
}
function unUsedInCol(j, num){
    for (var i = 0; i<9; i++)
        if (mat[i][j] == num)
            return false;
    return true;
}
function fillRemaining(i, j){
    if (j>=9 && i<9-1)
    {
        i = i + 1;
        j = 0;
    }
    if (i>=9 && j>=9)
        return true;

    if (i < 3)
    {
        if (j < 3)
            j = 3;
    }
    else if (i < 9-3)
    {
        if (j==i-i%3)
            j =  j + 3;
    }
    else
    {
        if (j == 9-3)
        {
            i = i + 1;
            j = 0;
            if (i>=9)
                return true;
        }
    }

    for (var num = 1; num<=9; num++)
    {
        if (CheckIfSafe(i, j, num))
        {
            mat[i][j] = num;
            if (fillRemaining(i, j+1))
                return true;

            mat[i][j] = 0;
        }
    }
    return false;
}
function removeKDigits()
{
    var count = K;
    while (count != 0)
    {
        var cellId = randomGenerator(9*9)-1;
        var i = (cellId-cellId%9)/9;
        var j = cellId%9;
        if (j != 0) j = j - 1;
        if (mat[i][j] != 0){
            count--;
            mat[i][j] = 0;
        }
    }
}

export {fillValues};
