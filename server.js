const path = require('path');
const express = require('express')
const bodyParser = require('body-parser');
const app = express();
const multer = require('multer');
const spawner = require('child_process').spawn;
const sessionstorage = require('sessionstorage');
const mongoose = require('mongoose');
// const { table } = require('console');

sessionstorage.setItem("username", "Log In")
app.set("view engine", "ejs");
app.use(express.static(path.resolve('public')));
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;

mongoose.set("strictQuery", false);
mongoose.connect('mongodb://127.0.0.1:27017/sudokuDB');

const personScehma = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    status: {
        type: [[Number]],
        default: [[0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0]]
    }
});

const credential = mongoose.model('credential', personScehma);

const credentials = [
    {
        name: "Alexander",
        username: "alexander@gmail.com",
        password: "alexander"
    },
    {
        name: "Bobby",
        username: "bobby@gmail.com",
        password: "bobby"
    }
];

// credential.insertMany(credentials, function (err){
//     if (err) throw err;
//     else console.log("Succeeded");
// });



function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './public/uploads')
    },
    filename: function(req, file, callback) {
        var ffile = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        // console.log(ffile);
        sessionstorage.setItem('ffile',ffile);
        callback(null, ffile)
    }
});

var ids = [];
for(var I = 0; I < 3; I++) {
    for(var J = 0; J < 3; J++) {
        var temp = [];
        for(var i = 0; i < 3; i++) {
            for(var j = 0; j < 3; j++) {
                temp.push([3*I+i, 3*J+j]);
            }
        }
        ids.push(temp);
    }
}

var upload = multer({ storage: storage });


function updateTable(table){
    var newTable = [];
    for(var I = 0; I < 3; I++) {
        for(var J = 0; J < 3; J++) {
            var box = [];
            for(var i = 0; i < 3; i++) {
                for(var j = 0; j < 3; j++) {
                    box.push(table[3*I+i][3*J+j]);
                }
            }
            newTable.push(box);
        }
    }
    return newTable;
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
app.get('/login', (req,res) => {
    res.render('login');
})
app.post('/login', (req,res) => {
    // console.log(req.body);
    credential.findOne({username: req.body.username}, (err, user) => {
        if(err) throw err;
        // console.log(user);
        if(user.password == req.body.password) {
            sessionstorage.setItem("name", user.name);
            sessionstorage.setItem("username", user.username);
            res.redirect('/');
        }
        else res.redirect('/login');
    });

});

app.get('/logout', (req,res) => {
    sessionstorage.setItem("name","Log In")
    res.redirect('/login');
});

app.get('/signup', (req,res) => {
    res.render('signup');
});

app.post('/signup', (req,res) => {
    console.log(req.body);
    credential.insertMany([
        {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password
        }
    ], function (err){
        if (err) throw err;
        else console.log("Succeeded");
    });
    res.redirect('/login');
});

app.get('/', (req,res) => {
    res.render('home',{name: sessionstorage.getItem("name")});
});

app.get('/file-upload', (req, res) => {
    res.render("file-upload",{name: sessionstorage.getItem("name")});
});


app.post('/file-upload',upload.single('photo'), async function(req,res){
    var ffile = sessionstorage.getItem('ffile');
    var table=[];
    // console.log(ffile);
    var process = spawner('python',["./main.py",String("./public/uploads/"+ffile)] );
    process.stdout.on('data', function(data) {
        table = JSON.parse(data);
        // console.log(table);
    });
    // console.log(table.length);
    while (table.length==0) await sleep(1000);
    // console.log(table);
    sessionstorage.setItem("table",table);
    res.redirect('/index');
});

app.get('/index', (req, res) => {
    var table = sessionstorage.getItem("table");
    var newTable = updateTable(table);
    var ffile = sessionstorage.getItem('ffile');

    res.render("index",{name: sessionstorage.getItem("name"), table: newTable, ids: ids, dest: String("uploads/"+ffile)});
});

app.post('/index', async (req, res) => {
    var table = sessionstorage.getItem("table");
    for(var i = 0; i < 9; i++) {
        for(var j = 0; j < 9; j++) {
            var str = "cell"+i.toString()+j.toString();
            if(req.body[str] == "") table[i][j] = 0;
            else{
                // try {
                //     table[i][j] = parseInt(req.body[str]);
                // } catch (NumberFormatException e) {
                //     return null;
                // }
                table[i][j] = parseInt(req.body[str]);
            }
        }
    }
    var solved = null;
    var process = spawner('python',["./solver.py", JSON.stringify(table)] );
    process.stdout.on('data', function(data){
        solved = JSON.parse(data);
    });
    while(!solved) await sleep(1000);
    var newTable = updateTable(solved);
    if (solved.length == 0) res.redirect("/index");
    else res.render('solved',{name: sessionstorage.getItem("name"), q: table, sol: solved, semi: table, table: newTable, ids: ids, goback:"/file-upload"});
});

app.get('/newgame', (req, res) =>{
    res.render('newgame',{name: sessionstorage.getItem("name")});
});

app.get('/mode', (req, res) =>{
    res.render('mode', {name: sessionstorage.getItem("name")});
});

app.post('/mode', (req, res) =>{
    if("easy" in req.body) sessionstorage.setItem("K",30);
    else if("medium" in req.body) sessionstorage.setItem("K",50);
    else sessionstorage.setItem("K",60);
    res.redirect("/generate");
});

app.get('/generate',(req,res) => {
    var mat=[[0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0]];
    K = sessionstorage.getItem('K');
    mat = fillValues(mat,K);
    var newMat = updateTable(mat);
    sessionstorage.setItem("table",mat);
    res.render('generate',{name: sessionstorage.getItem("name"), q: mat, table: newMat, ids: ids});
});

app.post('/generate', async (req, res) => {
    var mat = sessionstorage.getItem("table");
    var table = Array(9).fill().map(() => Array(9).fill(0));
    for(var i = 0; i < 9; i++) {
        for(var j = 0; j < 9; j++) {
            var str = "cell"+i.toString()+j.toString();
            if(req.body[str] == "") table[i][j] = 0;
            else table[i][j] = parseInt(req.body[str]);
        }
    }
    var solved = null;
    var process = spawner('python',["./solver.py", JSON.stringify(mat)] );
    process.stdout.on('data', function(data){
        solved = JSON.parse(data);
    });
    while(!solved) await sleep(1000);
    var newMat = updateTable(solved);
    res.render('solved', {name: sessionstorage.getItem("name"), q: mat, sol: solved, semi: table, table: newMat, ids: ids, goback: "/generate"});
});

app.get('/continue', (req, res) =>{
    credential.findOne({username: sessionstorage.getItem('username') }, function (err, user) {
        if (err){
            console.log(err)
        }
        else{
            // console.log(user);
            var newMat = updateTable(user.status);
            res.render('generate',{name: sessionstorage.getItem("name"), q: user.status, table: newMat, ids: ids});
        }
    });
});

app.post('/save', (req, res) => {
    // console.log(req.body)
    var table = Array(9).fill().map(() => Array(9).fill(0));
    for(var i = 0; i < 9; i++) {
        for(var j = 0; j < 9; j++) {
            var str = "cell"+i.toString()+j.toString();
            if(req.body[str] == "") table[i][j] = 0;
            else table[i][j] = parseInt(req.body[str]);
        }
    }
    console.log(table);
    credential.updateOne({username: sessionstorage.getItem('username')}, {status: table});
    // console.log("Updated");
    res.redirect("/");

});






function fillValues(mat,K){
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
        for (var i=0; i<3; i++){
            for (var j=0; j<3; j++){
                do{
                    num = randomGenerator(9);
                }while (!unUsedInBox(row, col, num));
    
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
        for (var j = 0; j<9; j++) if (mat[i][j] == num) return false;
        return true;
    }
    function unUsedInCol(j, num){
        for (var i = 0; i<9; i++) if (mat[i][j] == num) return false;
        return true;
    }
    function fillRemaining(i, j){
        if (j>=9 && i<9-1){
            i = i + 1;
            j = 0;
        }
        if (i>=9 && j>=9) return true;
    
        if (i < 3){
            if (j < 3) j = 3;
        }
        else if (i < 9-3){
            if (j==i-i%3) j =  j + 3;
        }
        else{
            if (j == 9-3){
                i = i + 1;
                j = 0;
                if (i>=9) return true;
            }
        }
    
        for (var num = 1; num<=9; num++){
            if (CheckIfSafe(i, j, num)){
                mat[i][j] = num;
                if (fillRemaining(i, j+1)) return true;
                mat[i][j] = 0;
            }
        }
        return false;
    }
    function removeKDigits(){
        var count = K;
        while (count > 0){
            var cellId = randomGenerator(9*9)-1;
            var i = (cellId-cellId%9)/9;
            var j = cellId%9;
            if (mat[i][j] != 0){
                count--;
                mat[i][j] = 0;
            }
        }
    }
    fillDiagonal();
    fillRemaining(0, 3);
    // console.log(mat);
    removeKDigits();
    return mat;
}
