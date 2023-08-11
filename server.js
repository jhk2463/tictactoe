//Create http server object & make it listen on some port
//Pass the http server object to websocket object constructor
//If msg received from client is 'request' to upgrade to websocket protocol
//accept it, create unique connection with the client
//Send and receive messages with the client using that connection object

const { client } = require('websocket');

const http = require('http').createServer().listen(8080, console.log("Listening on port 8080"))
const WebSocket = require('websocket').server;    //Import websocket 
const wss = new WebSocket({'httpServer' : http}); //Create websocket server 

var clients = {};    //Store client connections with client id as key
var games = {};      //Store game objects with game id as key
//Array of arrays storing all possible winning states in cell-index form
const WIN_STATES = [ [0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];

//Dealing with client request to connect to server
wss.on('request', (req) => {
    const conn = req.accept(null, req.origin); //Variable to store particular client connection
    const clientId = Math.round(Math.random()*10) + Math.round(Math.random()*10) + Math.round(Math.random()*10) //Create 'unique' Id for client
    clients[clientId] = { 
        'conn' : conn,
        'username': 'name'
    };     //Store clientId and connection 
    conn.send(JSON.stringify({
        'tag': 'connected',          //Informing client that they are connected to server
        'clientId': clientId
    }));

    sendAvailableGames();

    conn.on('message', onMessage);
});

//Function to send list of available games to each client
function sendAvailableGames() {     
    const availableGames = {}; //Store game id of available games
    //Find games that have only 1 player             
    for(const game in games) {
        if(games[game].players.length<2){
            availableGames[game] = games[game].gamename;
        }
    }
    //Send to every client connected
    for(const client in clients) {
        clients[client].conn.send(JSON.stringify({
            'tag': 'gamesList',
            'list': availableGames
        }));
    }
}

//Function to send updated board to both players
function updateBoard(gameId) {
    games[gameId].players.forEach(player => {
        clients[player.clientId].conn.send(JSON.stringify({
            'tag': 'updateBoard',
            'isTurn': player.isTurn,
            'board': games[gameId].board
        }))
    })
}

//Function to check if cells of WIN_STATES are all the same symbol
function winState(gameId) {
    return WIN_STATES.some(state => {
        return (state.every(cell => {
            return games[gameId].board[cell]=='x'
            }) ||
            state.every(cell => {
                return games[gameId].board[cell]=='o'
            })
        );
    });
}

//Draw if every WIN_STATES has a mix of 'x' and 'o'
function drawState(gameId) {
    return WIN_STATES.every(state => {
        return (
            state.some(cell => {
                return games[gameId].board[cell]=='x'
            }) &&
            state.some(cell => {
                return games[gameId].board[cell]=='o'
            })
        );
    });
}

//Function to process message received from client
function onMessage(msg) {
    const data = JSON.parse(msg.utf8Data); //Need to use 'utf8Data' since we are on server
    switch(data.tag){
        case 'create':
            const gameId = Math.round(Math.random()*10) + Math.round(Math.random()*10) + Math.round(Math.random()*10) //Create 'unique' Id for game
            const board = ['','','','','','','','',''];

            const playerOne = {    //One player object
                'clientId': data.clientId,
                'username': data.username,
                'symbol': 'x',      //Player 1 is x, player 2 is o
                'isTurn': true,
            };
            const players = Array(playerOne);  //For two players

            games[gameId] = {   //Game object
                'board': board,
                'players': players,
                'gamename': data.username + "'s Room"
            };
            
            clients[data.clientId].conn.send(JSON.stringify({  //Send client the created game
                'tag': 'created',
                'gameId': gameId,
                'gamename': data.username + "'s  Room"
            }))
            sendAvailableGames();
            break;

        case 'join':
            const playerTwo = {
                'clientId': data.clientId,
                'username': data.username,
                'symbol': 'o',      //Player 1 is x, player 2 is o
                'isTurn': false,
            }
            games[data.gameId].players.push(playerTwo);    //Assign 2nd player to game
            sendAvailableGames();   //Refresh list of available games
            games[data.gameId].players.forEach(function(player,index) {
                var opponent = 'name';
                if (index == 0) {
                    opponent = games[data.gameId].players[1].username;
                } else {
                    opponent = games[data.gameId].players[0].username;
                }
                clients[player.clientId].conn.send(JSON.stringify({ //Send client the joined game
                    'tag': 'joined',
                    'gameId': data.gameId,
                    'symbol': player.symbol,
                    'opponent': opponent
                }))
            })
            /*
            games[data.gameId].players.forEach(player=> {
                clients[player.clientId].conn.send(JSON.stringify({ //Send client the joined game
                    'tag': 'joined',
                    'gameId': data.gameId,
                    'symbol': player.symbol
                }))
            })
            */
            updateBoard(data.gameId);
            break;

        case 'moveMade':
            //Update board based of msg from client
            games[data.gameId].board = data.board;
            //Check if someone has won, game is draw, or game is still on
            const isWinner = winState(data.gameId);
            const isDraw = drawState(data.gameId);
            if(isWinner){
                updateBoard(data.gameId);
                games[data.gameId].players.forEach(player => {
                    clients[player.clientId].conn.send(JSON.stringify({
                        'tag': 'winner',
                        'isTurn': player.isTurn,
                    }))
                })
            } else if(isDraw) {
                updateBoard(data.gameId);
                games[data.gameId].players.forEach(player => {
                    clients[player.clientId].conn.send(JSON.stringify({
                        'tag': 'gameDraw'
                    }))
                })
            } else {
                //Flip 'isTurn' for both players
                games[data.gameId].players.forEach(player => {
                    player.isTurn = !player.isTurn;
                });
                updateBoard(data.gameId);
            }
            break;

        case 'rematch':
            games[data.gameId].players.forEach(player => {
                if (player.clientId != data.clientId) {     //Let other player know opponent wants rematch
                    clients[player.clientId].conn.send(JSON.stringify({ 
                        'tag': 'rematch'
                    }));
                }
            });
            break;
        
        case 'reset':
            games[data.gameId].board = ['','','','','','','','',''];
            //Flip 'isTurn' for both players
            games[data.gameId].players.forEach(player => {
                player.isTurn = !player.isTurn;
            });
            updateBoard(data.gameId);
            break;

        case 'exit':
            games[data.gameId].players.forEach(player => {
                if (player.clientId != data.clientId) {     //Let other player know opponent has exited
                    clients[player.clientId].conn.send(JSON.stringify({ 
                        'tag': 'exit'
                    }));
                }
            });
            delete games[data.gameId];
            sendAvailableGames();
            break;
    }
}
