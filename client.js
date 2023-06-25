//Create websocket object
//Pass URL and port # of the server
//Every time server sends a message to client, ONMESSAGE event is triggered
//To send msg to server, SEND method of websocket object is used

const connectBox = document.querySelector('.connectBox');
const connect = document.querySelector('.connectBtn');
const sidebar = document.querySelector('.sidebar');
const create = document.querySelector('.createBtn');
const join = document.querySelector('.joinBtn');
const userCol = document.querySelector('.flex-col1')
const gamesList = document.querySelector('ul');
const board = document.querySelector('.board');
const cells = document.querySelectorAll('.cell');
const username = document.querySelector('#username');
create.disabled = true;
join.disabled = true;

var clientId;
var gameId;
var socket;
var symbol;

//Event listener for clicking on 'Connect' button
connect.addEventListener('click', (src) => {    //Click connect button to connect to server
    socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = onMessage;
    connectBox.style.display="none";    //Hides connect prompt 
    console.log(username.value);
});

//Event listener for clicking on 'Create' button
create.addEventListener('click', () => {
    socket.send(JSON.stringify({
        'tag': 'create',
        'clientId': clientId,
        'username': username.value
    }))
})

//Event listener for clicking on 'Join' button
join.addEventListener('click', () => {
    socket.send(JSON.stringify({
        'tag': 'join',
        'clientId': clientId,
        'gameId': gameId
    }))
})

//Functions to handle player making a move on the board
function makeMove() {
    //Add an event listener to empty cells
    cells.forEach(cell => {
        if(!cell.classList.contains('cross') && ! cell.classList.contains('circle')) {
            cell.addEventListener('click', cellClicked);
        }
    })
}
function cellClicked(src) {
    //Add player's symbol to the clicked cell
    let icon;
    if(symbol == 'x') {
        icon = 'cross';
    } else {
        icon = 'circle';
    }
    src.target.classList.add(icon)
    //Create a updated local 'board' based off 'cells' to send to server
    const board = []
    for(i=0; i<9; i++){
        if(cells[i].classList.contains('circle')){
            board[i] = 'o';
        } else if(cells[i].classList.contains('cross')){
            board[i] = 'x';
        } else{
            board[i] = '';
        }
    }
    //Remove all event listeners on cells since player has made a move
    cells.forEach(cell => {
        cell.removeEventListener('click', cellClicked);
    });
    //Send updated board to server
    socket.send(JSON.stringify({
        'tag': 'moveMade',
        'board': board,
        'clientId': clientId,
        'gameId': gameId
    }))
}

//Function to process message received from server
function onMessage(msg) {
    const data = JSON.parse(msg.data);
    //Process message from server based on 'tag'
    switch(data.tag){
        case 'connected':
            clientId = data.clientId;    //Create local copy of clientId sent from server
            
            userCol.innerHTML = `Name: ${username.value}`;
            userCol.classList.add('joinLabel'); //Make a label w/ client's Id number
            create.disabled = false;
            join.disabled = false;
            break;

        case 'gamesList':
            const games = data.list
            //Remove existing list and replace with new list sent from server to avoid duplicates
            while(gamesList.firstChild){ 
                gamesList.removeChild(gamesList.lastChild);
            }
            for(var game in games){
                const li = document.createElement('li');
                console.log(game);
                li.innerText = games[game];
                li.style.textAlign = 'center';
                gamesList.appendChild(li);
                li.addEventListener('click', () => {gameId = game}) //Store last list item clicked on as client's 'gameId'
            }
            /*
            games.forEach( game => {
                const li = document.createElement('li');
                li.innerText = game;
                li.style.textAlign = 'center';
                gamesList.appendChild(li);
                li.addEventListener('click', () => {gameId = game}) //Store last list item clicked on as client's 'gameId'
            }) 
            */
            break;

        case 'created':
            gameId = data.gameId;
            create.disabled = true;
            join.disabled = true;
            console.log(gameId);
            break;

        case 'joined':
            document.querySelector('.board').style.display='grid';
            symbol = data.symbol;
            if(symbol == 'x'){
                board.classList.add('cross');
            } else {
                board.classList.add('circle');
            }
            break;
        
        case 'updateBoard':
            //Make clean slate for the board
            cells.forEach(cell => {
                if(cell.classList.contains('cross')){
                    cell.classList.remove('cross');
                } else if (cell.classList.contains('circle')) {
                    cell.classList.remove('circle');
                }
            })
            //Loop through board array sent by server and update on client
            for(i=0; i<9; i++) {
                if(data.board[i] == 'x'){
                    cells[i].classList.add('cross');
                } else if(data.board[i] == 'o') {
                    cells[i].classList.add('circle');
                }
            }
            //Allow player to make move if it is their turn
            if(data.isTurn) {
                makeMove();
            }
            break;
        
        case 'winner':
            alert(`The winner is ${data.winner}`);
            break;

        case 'gameDraw':
            alert('The game is a draw');
            break;
    }

}