//Create websocket object
//Pass URL and port # of the server
//Every time server sends a message to client, ONMESSAGE event is triggered
//To send msg to server, SEND method of websocket object is used

const connectBox = document.querySelector('.connectBox');
const connect = document.querySelector('.connectBtn');
const sidebar = document.querySelector('.sidebar');
const exitBtn = document.querySelector('.exitBtn');
const create = document.querySelector('.createBtn');
const join = document.querySelector('.joinBtn');
const userCol = document.querySelector('.flex-col1')
const gamesList = document.querySelector('ul');
const board = document.querySelector('.board');
const cells = document.querySelectorAll('.cell');
const username = document.querySelector('#username');
const statusBox = document.querySelector('.statusBox');
const gameOpponent = document.querySelector('.gameOpponent');
const gameSymbol = document.querySelector('.gameSymbol');
const gameTurn = document.querySelector('.gameTurn');
const gameResult = document.querySelector('.gameResult');
const popup = document.querySelector('.popup');
create.disabled = true;
join.disabled = true;

var clientId;
var gameId;
var socket;
var symbol;
var rematchBool = 0;

//Event listener for clicking on 'Connect' button
connect.addEventListener('click', (src) => {    //Click connect button to connect to server
    socket = new WebSocket('ws://localhost:8080');
    socket.onmessage = onMessage;
    connectBox.style.display="none";    //Hides connect prompt 
    console.log(username.value);
});

/*
socket.addEventListener("close", (event) => {
    console.log("The connection has been closed successfully.");
    exit();
});

socket.onclose = function(e) {
    console.log('disconnected');
    exit();
};
*/

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
        'username': username.value,
        'gameId': gameId
    }))
})

//Functions to disable/enable buttons
function disableButtons(button) {
    button.disabled = true;
    button.classList.add('grey-out');
}
function enableButtons(button) {
    button.disabled = false;
    button.classList.remove('grey-out');
}

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
            enableButtons(create);
            enableButtons(join);
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
            disableButtons(create);
            disableButtons(join);
            gameTurn.innerText = "Waiting for opponent to join..."
            statusBox.style.display="inline"; 
            exitBtn.style.display="block";
            break;

        case 'joined':
            document.querySelector('.board').style.display='grid';
            symbol = data.symbol;
            gameSymbol.innerText = "You are '" + symbol + "'.";
            gameOpponent.innerText = "You are playing against " + data.opponent + ".";
            statusBox.style.display="inline"; 
            if(symbol == 'x'){
                board.classList.remove('circle');
                board.classList.add('cross');
            } else {
                board.classList.remove('cross');
                board.classList.add('circle');
            }
            disableButtons(exitBtn);
            disableButtons(create);
            disableButtons(join);
            exitBtn.style.display="block";
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
                gameTurn.innerText = "It is your turn";
                makeMove();
            } else {
                gameTurn.innerText = "Opponent is making a move";
            }
            break;
        
        case 'winner':
            popup.style.display='flex';
            if(data.isTurn) {
                gameResult.innerText = 'You won!';
            } else {
                gameResult.innerText = 'You lost!';
            }
            break;

        case 'gameDraw':
            popup.style.display='flex';
            gameResult.innerText = 'The game is a draw';
            break;
        
        case 'rematch':
            rematchBool = 1;
            gameResult.innerText = 'Opponent wants a rematch!';
            break;

        case 'exit':
            gameTurn.innerText = 'Opponent has exited the room. Please exit the room to continue playing!';
            enableButtons(exitBtn);
            popup.style.display='none';
            break;
    }

}

function rematch() {
    if (rematchBool == 0) {
        socket.send(JSON.stringify({
            'tag': 'rematch',
            'gameId': gameId,
            'clientId': clientId
        }));
        gameTurn.innerText = 'Waiting for opponent response...';
        popup.style.display='none';
    }
    else {
        reset();
        rematchBool = 0;
    }
}

function reset() {
    socket.send(JSON.stringify({
        'tag': 'reset',
        'gameId': gameId
    }));
    popup.style.display='none';
}

function exit() {
    document.querySelector('.board').style.display='none';
    statusBox.style.display="none"; 
    popup.style.display='none';
    exitBtn.style.display='none';
    enableButtons(create);
    enableButtons(join);
    if(exitBtn.disabled == true)
    socket.send(JSON.stringify({
        'tag': 'exit',
        'gameId': gameId,
        'clientId': clientId
    }));
    gameId = 0;
}