
var Brag = require('./brag').Brag;
var venues = require('../models/venues').venues;
var exception = require('../lib/exception');

global.PLAYER_STATUS_NONE = 0,
global.PLAYER_STATUS_WAIT = 1,
global.PLAYER_STATUS_READY = 2,
global.PLAYER_STATUS_PLAYING = 3,
global.PLAYER_STATUS_TRUSTEESHIP = 4;

exports.start = function(callback) {
    var user = this.handshake.user,
        venue, room, brag, i, clients, client;

    try {
        exception.is_exist.user('player.start', user);
        venue = venues[user.vid];
        exception.is_exist.venue('player.start', venue);
        room = venue.rooms[user.rid];
        exception.is_exist.room('player.start', room);
        brag = room.brag;
        exception.is_exist.brag('player.start', brag);

        if (brag.start()) {
            console.log('-------------------------------');

            clients = room.clients;

            for (i = 0; i < clients.length; i++) {
                if (!(client = clients[i])) {
                    room.interrupt();
                    break;
                }

                client.emit('player operate', {
                    'status': 0,
                    'message': '开始游戏，player index: ' + room.brag.operator,
                    'data': {
                        'operator': room.brag.operator
                    }
                });
            }
        }
    }
    catch(e) {
        callback && callback({
            'error': e,
            'status': e.code
        });
    }
};

exports.ready = function(callback) {
    var user = this.handshake.user, count = 0,
        venue, room, clients, client, i, aUser;

    try {
        exception.is_exist.user('player.ready', user);
        venue = venues[user.vid];
        exception.is_exist.venue('player.ready', venue);
        room = venue.rooms[user.rid];
        exception.is_exist.room('player.ready', room);
        
        user['status'] = PLAYER_STATUS_READY;

        clients = room.clients;

        for (i = 0; i < clients.length; i++) {
            if (!(client = clients[i])) 
                continue;

            aUser = client.handshake.user;

            if (aUser['status'] === PLAYER_STATUS_READY) {
                count++;
            }

            if (client !== this) {
                client.emit('player ready', {
                    'status': 0,
                    'message': user['nickname'] + '玩家完成准备',
                    'data': {
                        'pIdx': clients.indexOf(this)
                    }
                });
            }
        }

        // if all client are ready, that distribute cards
        if (count === room.seating) {
            if (!room.brag) {
                room.brag = new Brag(room.seating, venue.chip);
            }

            room.brag.distribute();

            for (i = 0; i < clients.length; i++) {
                console.log(i);
                if (!(client = clients[i])) {
                    room.interrupt();
                    break;
                }
                
                client.handshake.user['status'] = PLAYER_STATUS_PLAYING;

                client.emit('brag distribute', {
                    'status': 0,
                    'message': '发牌',
                    'data': {
                        'cards': room.brag.outputCards(i)
                    }
                });
            }
        }
        else {
            callback && callback({
                'status': 0,
                'message': '准备成功'
            });
        }
    }
    catch(e) {
        callback && callback({
            'error': e,
            'status': e.code
        });
    }
};

exports.operate = function() {
    var user = this.handshake.user,
        args = [].slice.call(arguments, 0),
        venue, room;

    var callback = args.pop();

    try {
        exception.is_exist.user('player.operate', user);
        venue = venues[user.vid];
        exception.is_exist.venue('player.operate', venue);
        room = venue.rooms[user.rid];
        exception.is_exist.room('player.operate', room);
        
        if (!args.length) {
            // process believe
            // not params
        } 
        else if (typeof args[0] === 'string') {
            // process turnon
            // params: uid, index
            // require player id and index of cards two params
        }
        else {
            // process put cards
            // params: cards, value
            // require put cards and card value for this cards two params
        }

        callback && callback({
            'status': 0,
            'message': '操作成功'
        });
    }
    catch(e) {
        callback && callback({
            'error': e,
            'status': e.code
        });
    }
};

exports.trusteeship = function(callback) {
    var user = this.handshake.user,
        venue, room, clients, client, aUser, i;

    try {
        exception.is_exist.user('player.trusteeship', user);

        if (user['status'] === PLAYER_STATUS_TRUSTEESHIP) 
            return;

        exception.can_trusteeship('player.trusteeship', user);
        
        venue = venues[user.vid];
        exception.is_exist.venue('player.trusteeship', venue);

        room = venue.rooms[user.rid];
        exception.is_exist.room('player.trusteeship', room);

        try {
            user['status'] = PLAYER_STATUS_TRUSTEESHIP;

            clients = room.clients;

            for (i = 0; i < clients.length; i++) {
                client = clients[i];

                if (client && client !== this) {
                    aUser = client.handshake.user;

                    client.emit('player trusteeship', {
                        'status': 0,
                        'message': aUser['nickname'] + '玩家开始托管',
                        'data': {
                            'uid': aUser['_id']
                        }
                    });
                }
            }

            callback && callback({
                'status': 0,
                'message': '托管成功'
            });
        }
        catch(e) {
            callback && callback({
                'error': e,
                'status': e.code
            });
        }
    }
    catch(e) {
        callback && callback({
            'error': e,
            'status': e.code
        });
    }
};

exports.cancelTrusteeship = function(callback) {
    var user = this.handshake.user,
        venue, room, i, clients, client, aUser;

    try {
        exception.is_exist.user('player.cancelTrusteeship', user);
        exception.is_trusteeship('player.cancelTrusteeship', user);

        venue = venues[user.vid];
        exception.is_exist.venue('player.cancelTrusteeship', venue);

        room = venue.rooms[user.rid];
        exception.is_exist.room('player.cancelTrusteeship', room);
        
        try {
            user['status'] = PLAYER_STATUS_PLAYING;

            clients = room.clients;

            for (i = 0; i < clients.length; i++) {
                client = clients[i];

                if (client && client !== this) {
                    aUser = client.handshake.user;

                    client.emit('player cancel trusteeship', {
                        'status': 0,
                        'message': aUser['nickname'] + '玩家取消托管',
                        'data': {
                            'uid': aUser['_id']
                        }
                    });
                }
            }

            callback && callback({
                'status': 0,
                'message': '取消托管成功'
            });
        }
        catch(e) {
            callback && callback({
                'error': e,
                'status': e.code
            });
        }
    }
    catch(e) {
        callback && callback({
            'error': e,
            'status': e.code
        });
    }
};

exports.output_user_info = function(client) {
    var user = client.handshake.user;

    if (!user) return null;

    return {
        '_id': user['_id'],
        'nickname': user['nickname'],
        'openid': user['openid'],
        'sex': user['sex'],
        'avatar_url': user['avatar_url'],
        'score': user['score'],
        'count_win': user['count_win'],
        'count_lose': user['count_lost'],
        'status': user['status']
    }
};
