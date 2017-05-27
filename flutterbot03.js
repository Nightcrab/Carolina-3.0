const Discord = require('discord.js');
const bot = new Discord.Client();

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync('./config.json'));
var data = 	JSON.parse(fs.readFileSync('./data.json'));
var prefix = settings.prefix;

var lastquote = '';
var onlinelol = true;
var logid = 0;
var replycheck = ['false','false','false'];
var spamwatch =
{
	imgspam	:	[
		['author','time','images posted']
	],
	
	repeatspam:	[
		['author','time','times repeated']
	],
	
	textspam:	[
		['author','time','times abused']
	],
	
	mentionspam:[
		['author','time','times mentioned']
	],
	
	joinspam:	[
		['author','time','times joined/left']
	],
	
	msgspam:	[
		['author','time']
	]
};

spamwatch.imgspam.length = 0;
spamwatch.repeatspam.length = 0;
spamwatch.textspam.length = 0;
spamwatch.mentionspam.length = 0;
spamwatch.joinspam.length = 0;
spamwatch.msgspam.length = 0;

var bot_protection = false;
var stopall = [false,null];
var speech;
var arguments;
var namen;
var	type;
var currentChannel;
var messagelog = [{log:'',size:0,channel:'',guild:''}];

function getName(args,position)
{
	if (args.length == position+1)
	{
		return args[position];
	}

	let namei = args[position].toString();
		
	for (i=position+1;i<args.length;i++)
	{
		namei = namei+' '+args[i].toString();
	}

	return namei;
	
}

var commandTable =
{
	complex	:	[
		{
			name	:	'kick',
			desc	:	'Kicks a user.',
			args	:	2,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				console.log('kicking user?');
				
				argus.shift();
				arguments = argus;				
				console.log(arguments);spamwatch.joinspam.length = 0;
				
				let user;
				
				type = arguments[0];
				namen = getName(arguments,1);
				let reason = getName(arguments,2);
				
				if (type !== 'id' && type !== 'user')
				{
					currentChannel.send("Invalid Usage");
					return;
				}
				if (namen.startsWith("<@") == true)
				{	
					user = msg.guild.members.get(mentiontouser(argus[1]).id);
				} 
				else if (namen == undefined)
				{
					currentChannel.send('Missing Arguments: Name not specified');
					return;
				}
				else
				{
					user = findUser(namen, msg.guild, 'id').user;
				}
				
				console.log(namen);
				{

					if (user !== 'unknown')
					{
						user.kick();
						currentChannel.send(user.user.username+" was kicked. Reason: "+reason)
						user.send("You were kicked. Reason: "+reason);
					}
					else
					{
						currentChannel.send("Failed to find that user.");
					}
				}
			}		
		},
		
		{
			name	:	'botprotection',
			desc	:	'Legacy command.',
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				arguments = argus.toString();
				
				if (msg.author == bot.user)
				{
					if (arguments == 'false')
					{
						currentChannel.send("Bot Protection was deactivated.");
						bot_protection = false;
					}
					else if (arguments == 'true')
					{
						bot_protection = true;
						currentChannel.send("Bot Protection was activated.");
					} else
					{
						currentChannel.send("Invalid Usage:\n!botprotection (true, false)");
					}
					
				} else
					
				{
					currentChannel.send("You are not permitted to use this command!");
				}
			}
		},
		
		{
			name	:	'say',
			desc	:	"It's a mystery.",
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				if (argus < this.args)
				{
					currentChannel.send("Missing arguments");
					return;
				}
				arguments = argus;
				speech = getName(arguments,0);
				
				if (msg.member.user.id == '108090007117438976')
				{
					msg.delete();
					currentChannel.send(speech);
				}
				else
				{
					currentChannel.send('Insufficient Permissions. You must be Q. Celestia to use this command '+msg.author.username+'.');
				}
			}
		},
		
		{
			name	:	'msg',
			desc	:	'Messages another user.',
			args	:	2,
			reqmsg	:	true,
			execute :	function(argus,msg)
			{
				for (var l in spamwatch.msgspam)
				{
					if (spamwatch.msgspam[l][0] == msg.author.id)
					{
						console.log('user is known');
						if (Date.now()-spamwatch.msgspam[l][1] < settings.msg_cooldown)
						{
							let time_left = Math.floor((settings.msg_cooldown-(Date.now()-spamwatch.msgspam[l][1]))/1000);
							msg.delete();
							console.log('wait for cooldown');
							msg.author.send("You must wait "+secondstominutes(time_left)+" seconds before sending another anonymous message!");
							return;
						}
					}
				}
				spamwatch.msgspam.push([msg.author.id, msg.createdTimestamp]);
				console.log(spamwatch.msgpsam);
				argus.shift();
				if (argus < this.args)
				{
					currentChannel.send("Missing arguments: requires id and message");
					return;
				}
				arguments = argus;
				
				namen = argus[0];
				
				if (mentiontouser(argus[0]) != 'unknown')
				{
					namen = mentiontouser(argus[0]).id;
				}
				
				speech = getName(arguments, 1);
				//console.log('1');
				for (i=0;i<data.msgblacklist;i++)
				{
					if (data.msgblacklist[i] == namen)
					{
						//console.log('2');
						msg.author.send("The user "+bot.users.get(namen).username+" you tried to message has disabled anonymous messaging.");
						msg.delete();
						return;
					}
				}
				
				bot.users.get(namen).send("``Someone sent you an anonymous message:``\n"+speech+"\n``You can disable these simply by telling me !togglemsgs``");
				msg.delete();
				console.log('sent message: '+speech);
			}
		},
		
		{
			name	:	'nick',
			desc	:	'Nicknames a user.',
			args	:	2,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				if (argus.length < this.args)
				{
					currentChannel.send("Missing arguments: requires (id,mention) and new nickname");
					return;
				}
				arguments = argus;
				type = arguments[0];
				namen = getName(arguments, 1)
				
				if (type == 'me')
				{
					msg.member.setNickname(namen);
				} 
				else if (type.startsWith('<@'))
				{
					findUser((mentiontouser(type).id), msg.guild, 'id').setNickname(namen);
				}
				else
				{
					findUser(type, msg.guild, 'id').setNickname(namen);
				}
				

			}
		},
		
		{
			name	:	'roll',
			desc	:	'Rolls a die.',
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				arguments = argus;
				if (argus.length < this.args)
				{
					arguments[0] = 6;
				}
				
				type = arguments[0];
				
				currentChannel.send("You rolled a "+type+"-sided die and got: "+getRandomInt(1,type));
			}
		},
		
		
		{
			name	:	'8ball',
			desc	:	'Magic eight ball.',
			args	:	1,
			reqmsg	:	false,
			execute	:	function()
			{
				var ans = getRandomInt(1,4);
				
				if (ans == 1)
				{
					currentChannel.send("I believe so.");
				}
				if (ans == 2)
				{
					currentChannel.send("Not likely.");
				}
				if (ans == 3)
				{
					currentChannel.send("Who told you that?");
				}
				if (ans == 4)
				{
					currentChannel.send("Of course.");
				}
			}
		},
		
		{
			name	:	'tribonacci',
			desc	:	"Calculates tribonacci sequence.",
			args	:	4,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				
				if (argus.length < this.args)
				{
					currentChannel.send("Missing arguments: requires 3 seeds and amount of values to sequence");
					return;
				}
				
				var seed1 = parseInt(argus[0]);
				var seed2 = parseInt(argus[1]);
				var seed3 = parseInt(argus[2]);
				var num	= parseInt(argus[3]);
				
				var sequence = [seed1,seed2,seed3];
				
				namen = '';
				
				for (i=4;i<num;i++)
				{
					sequence.push(sequence[i-2]+sequence[i-3]+sequence[i-4]);
				}
				currentChannel.send("``Check your Direct Messages!``");
				
				msg.author.send(sequence);
				//msg.author.send(sequence[sequence.length-2]/sequence[sequence.length-3]);
			}
		},
		
		{
			name	:	'info',
			desc	:	"Displays a user's information.",
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				namen = getName(argus,0);

				var infouser;
				
				if (namen.startsWith("<@") == true)
				{
					infouser = mentiontouser(namen);
				} 
				else
				{
					infouser = findUser(namen, msg.guild,'id').user;
				}

				if (infouser == undefined)
				{
					msg.channel.send("Couldn't find "+namen+"...");
					return;
				}
				let joindate = new Date(findUser(infouser.id, currentChannel.guild, 'id').joinedTimestamp);
				
				var embed = new Discord.RichEmbed()
				.setTitle("Info: "+infouser.username)
				.setColor(0x6699ff)
				.setAuthor("Carolina 3.0")
				.setDescription("\nUsername: "+infouser.username+"\nDiscriminator: "+infouser.discriminator+"\nID: "+infouser.id+"\nJoin Date: "+joindate.toString()+"\nStatus: "+infouser.presence.status)
 				.setThumbnail(infouser.avatarURL)
				.setFooter("Avatar URL:\n"+infouser.avatarURL);
				
				msg.channel.send({ embed });
				//currentChannel.send("As you requested: \nUsername: "+infouser.username+"\nDiscriminator: "+infouser.discriminator+"\nID: "+infouser.id+"\nAvatar: "+infouser.displayAvatarURL+"\nStatus: "+infouser.presence.status+"\nDate joined: "+joindate.toString());
			}
		},
		
		{
			name	:	'setconfig',
			desc	:	"Changes a setting in the  bot's config file.",
			args	:	2,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				
				if (argus.length != 2)
				{
					currentChannel.send("Lacking arguments");
					return;
				}
				let newsetting = getName(argus,1);
				
				if (!settings[argus[0]])
				{
					return;
				}
				if (typeof settings[argus[0]] == "boolean")
				{
					newsetting = (argus[1] == 'true');
				}
				else if (typeof settings[argus[0]] == "number")
				{
					newsetting = parseInt(argus[1]);
				}
				if (argus[0] == 'quoteusers') 
				{
					settings[argus[0]].push(argus[1]);
				}
				else
				{
				settings[argus[0]] = newsetting;
				}
				changeconfig(argus[0],newsetting);
				settings = JSON.parse(fs.readFileSync('./config.json'));
				prefix = settings.prefix;
			}
		},
		
		{
			name	:	'clear',
			desc	:	'Deletes specified amount of messages from channel',
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				if (argus.length == 0)
				{
					currentChannel.send("Lacking arguments");
				}
				
				currentChannel.bulkDelete(parseInt(argus[0])+1);
				console.log(parseInt(argus[0])+1);
				currentChannel.send("Removed "+argus[0]+" messages!");
			}
		},
		
		{
			name	:	'execute',
			desc	:	"Don't even try it. eval() command.",
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				
				if (msg.author.id !== '108090007117438976')
				{
					return;
				}
				
				argus.shift();
				namen = '';
				
				for (i=0;i<argus.length;i++)
				{
					namen = namen+' '+argus[i];
				}
				
				eval(namen);
				msg.delete();
			}
		},
		
		{
			name	:	"replace",
			desc	:	"Replaces certain words in a text.",
			args	:	"lots of them",
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				let phrase = '';
				for (var i in argus)
				{
					phrase += argus[i]+' ';
				}
				currentChannel.send(replaceword(phrase,"kimball","kimble"));
			}
		},
		
		{
			name 	:	'rvbquote',
			desc	:	"Generates a random Red vs Blue quote.",
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				console.log("getting quote");
				argus.shift();
				
				let character;
				if (argus[0].toLowerCase() != "random") {character = data.redvblue_quotes[argus[0].toLowerCase()];} else {character = data.redvblue_quotes[randProp(data.redvblue_quotes)];}
				console.log(character);
				if (character == undefined) {currentChannel.send("Invalid character, did you mean Tucker?"); return;}
				let quote = character[getRandomInt(0,character.length)];
				
				for (i=0;i<character.length;i++)
				{
					if (quote.quote == lastquote)
					{
						let quote = character[getRandomInt(0,character.length)];
						console.log("copy quote");
					}
					else
					{
						break;
					}
				}
				
				console.log(quote);
				
				currentChannel.send('"'+quote.quote+'" - '+quote.desc);
				lastquote = quote.quote;
			}
		},
		
		{
			name	:	'addquote',
			desc	:	"Add a Red vs Blue quote.",
			args	:	2,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				let permitted = false;
				for (var i in settings.quoteusers)
				{
					if (settings.quoteusers[i] == msg.author.id) {permitted = true; break;}
				}
				if (!permitted) {return;}
				
				argus.shift();
				if (argus.length<2){return;}
				
				let newquote = getName(argus,1);
				let character = argus[0].toLowerCase();
				
				if (!data.redvblue_quotes[character])
				{
					data.redvblue_quotes[character] = [];
				}
				for (var s in data.redvblue_quotes)
				{
					for (var n in data.redvblue_quotes[s])
					{
						if (removepunctuation(newquote.toLowerCase()) == removepunctuation(data.redvblue_quotes[s][n].quote.toLowerCase()))
						{
							currentChannel.send("Quote already exists.");
							return;
						}
					}
				}
				
				data.redvblue_quotes[character].push({quote:newquote,desc:capitalise(character)});
				fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), function (err) 
				{
					if (err) return console.log(err);
				});
				currentChannel.send("Added quote!");
			}
		},
		
		{
			name	:	"showlog",
			desc	:	"DMs you a specific log of the chat's messages",
			args	:	1,
			reqmsg	:	true,
			execute	:	function(argus,msg)
			{
				argus.shift();
				let path = "./Log/"+msg.guild+"/"+argus[0]+"/"+argus[1]+".txt";
				
				msg.author.send({files:[path]});
			}
		}
		
	],
	
	basic	:	[
		
		{
			name	:	'about',
			desc	:	'Displays bot information.',
			reqmsg	:	false,
			execute	:	function()
			{
				currentChannel.send("I was created by:\n"+bot.users.get('108090007117438976').username+"\n"+bot.users.get('108090007117438976').id);
			}
		},	
		
		{
			name	:	'help',
			desc	:	'Displays all commands.',
			reqmsg	:	true,
			execute	:	function(msg)
			{
				namen = '';
				
				for (i=0;i<commandTable.complex.length;i++)
				{
					namen = namen+commandTable.complex[i].name+': '+commandTable.complex[i].desc+'\n';
				}
				for (i=0;i<commandTable.basic.length;i++)
				{
					namen = namen+commandTable.basic[i].name+': '+commandTable.basic[i].desc+'\n';
				}
				
				msg.author.send('```'+namen+'```');
			}	
		},
		
		{
			name	:	'log',
			desc	:	'Saves message log to file.',
			reqmsg	: 	true,
			execute	:	function(msg,logobj)
			{
				//console.log('logging\n'+messagelog);
				if (!logobj)
				{
					for (var i in messagelog)
					{
						if (messagelog[i].channel == msg.channel.id)
						{
							logobj = i;
							break;
						}
					}
					if (!logobj) {return;}
				}
				let Guild = bot.guilds.get(messagelog[logobj].guild);
				let Channel = bot.channels.get(messagelog[logobj].channel);
				console.log(messagelog[logobj]);
				
				var day = new Date().getDate();
				var month = new Date().getMonth();
				var year = new Date().getFullYear();
				var date = year+"-"+month+"-"+day;
				
				if (!fs.existsSync("./Log/"+Guild.name))
				{
					fs.mkdirSync("./Log/"+Guild.name);
					fs.mkdirSync("./Log/"+Guild.name+"/"+date);
					fs.writeFileSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt",'');
				}
				else if (!fs.existsSync("./Log/"+Guild.name+"/"+date))
				{
					fs.mkdirSync("./Log/"+Guild.name+"/"+date);
					fs.writeFileSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt",'');
				}
				if (fs.existsSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt"))
				{
					var logfile = fs.readFileSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt");

					logfile+=messagelog[logobj].log;

					fs.writeFileSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt", logfile);
					messagelog[logobj].size = 0;
					messagelog[logobj].log = '';
				}
				else
				{
					fs.writeFileSync("./Log/"+Guild.name+"/"+date+"/"+Channel.name+".txt",'');
				}
				///currentChannel.send('Logged '+messagelog.length+' messages!');
				//messagelog.length = 0;
				
			}
		},
		
		{
			name	:	'ping',
			desc	:	"Gets response time in ms.",
			reqmsg	:	true,
			execute	:	function(msg)
			{
				console.log(msg.createdTimestamp);
				msg.reply(`Response Time: \`${Date.now() - msg.createdTimestamp} ms!\``);
			}
		},
		
		{
			name	:	'stopall',
			desc	:	"Pauses the channel.",
			reqmsg	:	true,
			execute :	function(msg)
			{
				currentChannel.send("Channel is now paused!");
				stopall = [true, msg.channel];
			}
		},
		
		{
			name	:	'startall',
			desc	:	"Unpauses the channel.",
			reqmsg	:	false,
			execute :	function()
			{
				stopall[0] = false;
			}
		},
		
		{
			name	:	'checkprimes',
			desc	:	'retired command',
			reqmsg	:	false,
			execute	:	function()
			{
				var primes = [];
				
				namen = '';
				
				for (i=0;i<primes.length;i++)
				{
					var abcde = primes[i].toString();
					if (abcde.split('').includes('2') && abcde.split('').includes('9') && abcde.split('').includes('7') && abcde.split('').includes('3'))
					{
						namen = namen+abcde;
					}
				}
				
				console.log(abcde.split('').includes('9'));
			}
		},
		
		{
			name	:	'manual',
			desc	:	'DMs you with a full command guide and an explanation of all the configs.',
			reqmsg	:	true,
			execute	:	function(msg)
			{
				msg.author.send("```\
kick ['id','user'] (user or id) (reason)//kicks a user by their id or mention //example !kick user @T-Feeshy#6666 \n\
\n\
msg	(id) (msg) //anonymously messages a user by their id or mention //example !msg 202531123564118011 hello there \n\
\n\
nick (id, mention) (nickname) //nicknames a user //example !nick 202531173564118016 I like cake \n\
\n\
roll (number of sides)	//rolls a die //example !roll 8 \n\
\n\
8ball (question) //magic 8 ball	//example !8ball does Kyu love me? \n\
\n\
tribonacci (seed1)(seed2)(seed3) (number of terms) //DMs you a tribonacci sequence with 3 seeds and n terms //example !tribonacci 1 4 3 90 \n\
\n\
info (mention, username) //Posts a user's id, name, avatar, nickname, time of join, etc. //example !info @Q. Celestia#1380 \n\
\n\
setconfig (config name) (new value) //Changes a config //example !setconfig prefix > \n\
\n\
rvbquote (name, or random) //Get a random Red vs Blue quote from a character //example !rvbquote Tucker // !rvbquote random \n\
\n\
addquote (name) (quote) //Add a new Red vs Blue quote //example !addquote Tucker Bow Chicka Bow Wow \n\
\n\
showlog (date) (channel name) //Get a specific log file from the guild //example !showlog 2017-4-27 general \n\
\n\
clear (number of messages) //Deletes specified amount of messages from channel //example !clear 40```");
			}
			
		},
		
		{
			name	:	'togglemsgs',
			desc	:	"Disables/Enables anonymous messaging using the !msg function",
			reqmsg	:	true,
			execute	:	function(msg)
			{
				for (i=0;i<data.msgblacklist;i++)
				{
					if (data.msgblacklist[i] == msg.author.id)
					{
						data.msgblacklist.splice(i,1);
						
						fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), function (err) 
						{
							if (err) return console.log(err);
						});
						return;
					}
				}
				data.msgblacklist.push(msg.author.id);
				
				fs.writeFileSync('./data.json', JSON.stringify(data, null, 4), function (err) 
				{
					if (err) return console.log(err);
				});
				
				msg.author.send("Anonymous messages were toggled.");
			}
		}
		
	],
	
	chat	:	[
		
		{
			name	:	'hello',
			desc	:	'Hello.',
			reqmsg	:	true,
			execute	:	function(msg)
			{
				
			}
		}
	]
}
function mentiontouser(mention)
{
	let userid = mention.split('');
	userid.shift();
	userid.shift();
	userid.pop();
	if (bot.users.get(userid.toString().replace(/,/g,"")) !== undefined)
	{
		return bot.users.get(userid.toString().replace(/,/g,""));
	}
		return 'unknown';
}

function secondstominutes(seconds)
{
	let minutes = Math.floor(seconds/60);
	let remainder = (seconds % 60);
	
	return (minutes+" minutes and "+remainder+" seconds");
}

function changeconfig(change,newval)
{
	fs.writeFileSync('./config.json', JSON.stringify(settings, null, 4), function (err) 
	{
		if (err) return console.log(err);
	});
	currentChannel.send('Set '+change+' to '+newval+'!');
}

function joinString(array)
{
	var joinedstr = '';
	
	for (i=0;i<array.length;i++)
	{
		joinedstr = joinedstr+array[i];
	}
	
	return joinedstr;
}

function capitalise(string)
{
	let astring = string.split('');
	astring.splice(0,1,astring[0].toUpperCase());
	let nstring = '';
	for (var i in astring)
	{
		nstring += astring[i];
	}
	return nstring;
}

function randProp(obj)
{
    var result;
    var count = 0;
    for (var prop in obj)
    	if (Math.random() < 1/++count)
           result = prop;
    return result;
}

function stringToBool(string)
{
	if (string == 'true')
	{
		return true;
	}
	else if (string == 'false')
	{
		return false;
	}
	
	return true;
	console.log('string is not a boolean!');
}

function checkCommand (com,msg)
{
	var branch = commandTable;
	var mcom = '';
	//console.log(msg);
	
	let msgsplit = msg.content.split('').splice(0,settings.prefix.length);
	
	if (msgsplit == prefix)
	{
		console.log(msgsplit);
		if (msg.content.split(' ').length > 1)
		{
			branch = commandTable.complex;
			
		} else
		{
			branch = commandTable.basic;
		}
	}
	else
	{
		branch = commandTable.chat;
	}
	
	if (branch == commandTable.basic || branch == commandTable.complex)
	{
		mcom = maCommandIs(msg)[0].split('');
		mcom.shift();
		mcom = joinString(mcom);
	}
	else
	{
		mcom = com;
	}
	
	if (com != joinString(msg.content.split(' ')[0]))
	{
		console.log('not command '+com);
		console.log('tested against: '+maCommandIs(msg)[0]);
		return;
	}
	
	console.log('is command: '+mcom);
	//console.log(branch);
	
	for (i=0;i<branch.length;i++)
	{
		if (branch[i].name.toLowerCase() == mcom)
		{
			console.log('found command');
			if (branch[i].reqmsg == true && branch == commandTable.complex)
			{	
				console.log("complex command");
				console.log(msg.content.split(' '));
				branch[i].execute(msg.content.split(' '), msg);
				
			}
			else if (branch[i].reqmsg == true && branch == commandTable.basic)
			{
				branch[i].execute(msg);
				console.log('basic command');
				
			} 
			else if (branch[i].reqmsg == true && branch == commandTable.chat)
			{
				branch[i].execute(msg.content.split(' '));
			}
			else
				
			branch[i].execute(msg.content.split(' '));
			return;
		}
	}
}

function newfileid()
{
	for (i=0;i<100;i++)
	{
		if (fs.existsSync('./Archive/log'+i+'.txt') == false)
		{
			return i;
		}
	}
}

function checkUserDiff(oldm,newm)
{
	console.log('old name:'+oldm.user+'\nnewname:'+newm);
	
	if (oldm.nickname !== newm.nickname)
	{
		return 'username';
	} 
	else if (oldm.user.avatar !== newm.user.avatar)
	{
		return 'avatar';
	}
	else if (oldm.roles.array().length < newm.roles.array().length)
	{
		return 'role';
	}
	
	return 'nope';
}

function findUser(name, gld, mode)
{
	var channelarr = gld.members.array();
	
	if (mode == 'name')
	{
		for (i=0;i<gld.members.array().length;i++)
		{
			if (gld.members.array()[i].user.username == name)
			{
				return gld.members.array()[i];
			}
		}

		return 'unknown';
	}
	
	if (mode == 'id')
	{
		for (i=0;i<gld.members.array().length;i++)
		{
			if (gld.members.array()[i].user.id == name)
			{
				return gld.members.array()[i];
			}
		}
		
		return 'unknown';
	}
}

function CommandIs(string,msg)
{
	return msg.content.startsWith('!'+string);
}

function getRandomInt(min, max) 
{
 	min = Math.ceil(min);
  	max = Math.floor(max);
  	return Math.floor(Math.random() * (max - min)) + min;
}
				
function maCommandIs(msg)
{
	var messg = msg.toString();
	var newstring = messg.split(' ');
	
	return newstring;
}

function pluck(array)
{
	return array.map(function(item){return item['name'];});
}

function hasRole(member, role)
{
	if (pluck(member.roles).includes(role))
	{
		return true;
	}
	else
	{
		return false;
	}
}

function sendreply(msg,member)
{
	var mes = msg.content.toLowerCase()
	
	function mci(a)
	{
		return maCommandIs(a);
	}
		
	if (replycheck[2] == 'thanks')
	{
		
		if (mci(mes)[0] == 'thanks' || mci(mes)[0] == 'thanks!' || mci(mes)[0] == 'thanks.')
		{
			msg.channel.send("No problem, "+member.username+'!');
			replycheck = ['false','false','false'];
		}
	}
	
	if (replycheck[2] == 'yesthanks')
	{
		if (mci(mes)[0] == 'sure' || mci(mes)[0] == 'sure.' || mci(mes)[0] == 'yes' || mci(mes)[0] == 'yes!')
		{
			msg.channel.send("Got it, "+member.username+'!');
			replycheck = ['false','false','false'];
		}
	}
		
}

function spamcheck(msg)
{
	function checkAuthor(array, author)
	{
		for (i=0;i<array.length;i++)
		{
			if (array[i][0] == author.id)
			{
				console.log('same author');
				return array[i]; 
			}
		}
		console.log('different author, '+array)
		return false;
	}
	
	for (i=0;i<spamwatch.mentionspam.length;i++)
	{
		//if (spamwatch.mentionspam[i][1] ==  )
		//{
			
		//}
	}
	
	if (msg.content.split(':')[0] == 'https' || msg.content.split(':')[0] == 'http')
	{
		console.log('link');
		if (checkAuthor(spamwatch.imgspam, msg.author) !== false)
		{
			if (Date.now() - checkAuthor(spamwatch.imgspam, msg.author)[1] > settings.linkspam_cooldown)
			{
				checkAuthor(spamwatch.imgspam, msg.author)[1] = Date.now();
				checkAuthor(spamwatch.imgspam, msg.author)[2] = 1;
				return;
			}
			
			checkAuthor(spamwatch.imgspam, msg.author)[2] += 1; 
			
			if (checkAuthor(spamwatch.imgspam, msg.author)[2] == settings.linkwarn_limit)
			{
				currentChannel.send(msg.author+', you are posting too many links!');
				console.log(spamwatch);
			}
			
			if (checkAuthor(spamwatch.imgspam, msg.author)[2] > settings.linkkick_limit)
			{
				findUser(msg.author.username, msg.guild, 'name').kick();
				currentChannel.send('Kicked '+msg.author.username+'!');
			}
			
		} 
		else
		{
			spamwatch.imgspam.push([msg.author.id, Date.now(), 1]);
		}
	}
	if (msg.mentions.users.size > 0)
	{
		if(msg.mentions.users.size > 4)
		{
			currentChannel.send(msg.author+', you are posting too many mentions!');
		}
		
		if (Date.now() - checkAuthor(spamwatch.mentionspam, msg.author)[1] > settings.mentionspam_cooldown)
		{
			checkAuthor(spamwatch.mentionspam, msg.author)[1] = Date.now();
			checkAuthor(spamwatch.mentionspam, msg.author)[2] = 1;
			return;
		}
		
		if (checkAuthor(spamwatch.mentionspam, msg.author) !== false)
		{
			checkAuthor(spamwatch.mentionspam, msg.author)[2] += 1; 
			
			if (checkAuthor(spamwatch.mentionspam, msg.author)[2] == 4)
			{
				currentChannel.send(msg.author+', you are posting too many mentions!');
				console.log(spamwatch);
			}
			
			if (checkAuthor(spamwatch.mentionspam, msg.author)[2] > 4)
			{
				findUser(msg.author.username, msg.guild, 'name').kick();
				currentChannel.send('Kicked '+msg.author.username+'!');
			}
		}
		else
		{
			spamwatch.mentionspam.push([msg.author.id, Date.now(), 1]);
		}
		console.log(spamwatch);
	}
	
}

function init()
{
	bot.user.setGame(settings.prefix+"help");
}

bot.on('guildMemberUpdate', (oldMember, newMember) =>
{
	if (settings.update) { return; }
	console.log('member changed something')
	
	var updatetype = checkUserDiff(oldMember, newMember);
	
	if (updatetype == 'avatar')
	{
		newMember.guild.defaultChannel.send('I like your new avatar, '+newMember.user.username+'!');
		replycheck = ['true',newMember.user,'thanks'];
	} else if (updatetype == 'role')
	{
		newMember.guild.defaultChannel.send('Congratulations on your new role, '+newMember.user.username+'!');
		replycheck = ['true',newMember.user,'thanks'];
		
	} else if (updatetype == 'username')
	{
		if (newMember.nickname !== null)
		{
			newMember.guild.defaultChannel.send('I guess I shall call you '+newMember.nickname+' from now on, '+oldMember.user.username+'?');
		}
		else
		{
			newMember.guild.defaultChannel.send('Should I go back to calling you '+oldMember.user.username+' then, '+oldMember.user.username+'?');
		}
		
		replycheck = ['true',newMember.user,'yesthanks'];
	}
	
	if (updatetype == 'nope')
	{
		console.log('failed to identify update type');
	}
	
});

function removepunctuation(string)
{
	//let array = string.split('');
	//let punctuation = ["'","/"," ","!","?","-","`",";",":",".","@","#","$","%","^","&","*","(",")"];
	let nstring = string.replace(/[.,\/#<|@+?">!$%\^&\*;:{}=\-_`~() ]/g,"");
	return nstring;
}

function replaceword(string, word1, word2)
{
	let stringarr = string.split(' ');
	let newstring = '';
	for (i=0;i<stringarr.length;i++)
	{
		if (stringarr[i].toLowerCase() == word1)
		{
			stringarr.splice(i, 1, word2);
		}
	}
	for (i=0;i<stringarr.length;i++)
	{
		newstring += stringarr[i]+' ';
	}
	return newstring;
}

bot.on('ready', () =>
{
	init();
});

bot.on('guildMemberAdd', (member) =>
{
	if (!settings.join_alert) { return; }
	console.log('new member');
	
	member.guild.defaultChannel.send('Welcome to the chat, '+member.user.username+'!');
	
	if (member.user.bot == true && bot_protection == true)
	{
		member.guild.defaultChannel.send('Bot detected! Kicking bot - bot is unauthorised!');
		member.kick();
	}
});

bot.on('guildMemberRemove', (member) =>
{
	if (!settings.leave_alert) { return; }
	var time = new Date().getTime();
	var date = new Date(time);
	
	messagelog.push([member.user.id, member.user.username, date.toString(), 'left server!']);
});

bot.on('message', (message) => 
{
	if (message.author !== bot.user)
	{
		//return;
	}
	
	if (stopall[0] == true && message.channel == stopall[1] && message.author.id != 300809826164801539 )
	{
		checkCommand('!startall',message);
		message.delete();
	}
	else
	
	var name = '';
	currentChannel = message.channel;
	console.log(message.author.username+': '+message.content);
	
	var time = new Date().getTime();
	var date = new Date(time);
	//alert(date.toString());
	
	//messagelog.push([message.author.id, message.author.username, date.toString(), message.content]);
	let logexists = [false,false];
	
	for (var i in messagelog)
	{
		if (message.channel.type != "text"){return;}
		
		if (messagelog[i].guild == message.guild.id)
		{
			logexists[0] = true;
			if (messagelog[i].channel == message.channel.id)
			{
				logexists[1] = true;
				logexists[2] = i;
			}
		}
		
		
	}
	if (logexists[0] == true && logexists[1] == true)
	{
		messagelog[logexists[2]].log += '\n'+date.toString()+' | '+message.author.id+' | '+message.author.username+' : '+message.content;
		messagelog[logexists[2]].size += 1;
	}
	else if (logexists[0] != true || logexists[1] != true)
	{
		messagelog.push({log:'\n'+date.toString()+' | '+message.author.id+' | '+message.author.username+' : '+message.content,size:1,channel:message.channel.id,guild:message.guild.id});
	}
	//if (message.content.split('').length > 200)
	//{
	//	message.delete();
	//	currentChannel.send("Removed "+message.author.username+"'s message. \nReason: Too Long!");
		
	//} else
		
	//console.log(message.content.split('').length);
	if (message.channel.type != 'dm')
	{
		if (message.member.hasPermission('KICK_MEMBERS') || message.author.id == '108090007117438976')
		{
			checkCommand(prefix+'kick',message);
		}
		if (message.member.hasPermission('MANAGE_NICKNAMES') || message.author.id == '108090007117438976')
		{
			checkCommand(prefix+'nick',message);
		}
		if (message.member.hasPermission('ADMINISTRATOR') || message.author.id == '108090007117438976')
		{
			checkCommand(prefix+'say',message);
			checkCommand(prefix+'botprotection',message);
			checkCommand(prefix+'setconfig',message);
		}
		if (message.member.hasPermission('MANAGE_MESSAGES') || message.author.id == '108090007117438976')
		{
			checkCommand(prefix+'clear',message);
			checkCommand(prefix+'stopall',message);
			checkCommand(prefix+'startall',message);
		}
	}
	
	checkCommand(prefix+'about',message);
	checkCommand(prefix+'rvbquote',message);
	//checkCommand(prefix+'say',message);
	checkCommand(prefix+'ping',message);
	checkCommand(prefix+'msg',message);
	checkCommand(prefix+'help',message);
	checkCommand(prefix+'log',message);
	checkCommand(prefix+'roll',message);	
	checkCommand(prefix+'8ball',message);
	checkCommand(prefix+'tribonacci',message);	
	checkCommand(prefix+'info',message);
	checkCommand(prefix+'checkprimes',message);
	checkCommand(prefix+'execute',message);
	checkCommand(prefix+'manual',message);
	checkCommand(prefix+'togglemsgs',message);
	checkCommand(prefix+'replace',message);
	checkCommand(prefix+'addquote',message);
	checkCommand(prefix+'showlog',message);
	
	for (var i in messagelog)
	{
		if (messagelog[i].size > settings.logperiod)
		{
			console.log("Automatically logging messages...");
			commandTable.basic[2].execute(message,i);
		}
	}
	console.log(removepunctuation(message.content).toLowerCase());
	
	if (removepunctuation(message.content).toLowerCase() == 'kimball' && (message.author.id == '222385754167312384' || message.author.id == '108090007117438976' || message.author.id =="130750902712664065"))
	{
		message.channel.send('kimble');
	}
	spamcheck(message);
	
	//if (message.author.id == "279369135102623754" && message.content.toLowerCase() == )
	
	if (removepunctuation(message.content.split(' ')[0].toLowerCase()) == "hello" || removepunctuation(message.content.split(' ')[0].toLowerCase()) == "hey")
	{
		if (message.content.split(' ').length<2){return;}
		if (!removepunctuation(message.content.split(' ')[1])){return;}
		
		for (var n in data.alts)
		{
			console.log(data.alts[n]+","+message.content.split(' ')[1].toLowerCase());
			
			if (message.content.split(' ')[1].toLowerCase() == data.alts[n])
			{
				message.channel.send("Hello!");
			}
		}
	}
	
});
//flutterbot token MzAwODA5ODI2MTY0ODAxNTM5.C8x4lA.d4aQRLkdySz2JiXcz7CesMkCb34

bot.login('MzE2Nzc4ODkzNTM1MzQ2NzAx.DAaO3g.UFIdqEjpw0hweVO6q4uJhW_wsVc');