var express = require('express');
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');	
var passwordHash = require('password-hash');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var request = require('request');
var fs = require('fs');
const Web3 = require('web3');
const solc = require('solc');
var app = express();
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(morgan('combined'));

// Initialize global variables
global.web3 = null;
global.deployedContract = null;

app.use("/", express.static("ui"));

var username;
var password;

app.post('/login', function(req, res) {
    
	console.log(req.body);
    username = req.body.username;
    password = req.body.password;
    var hashedPassword = passwordHash.generate(password);
    console.log(hashedPassword);
    
    if (username == "admin" && password == "password") {

    	res.status(200).send({ message: hashedPassword});

    } else {
    	res.status(500).send({ message: 'error' });
    }
});

app.post('/auth', function(req, res) {
	var cookie_pass = req.cookies['auth'];
	if (passwordHash.verify('password', cookie_pass)) {
		res.status(200).send({ message: hashedPassword});
	} else {
		res.status(500).send({ message: 'error' });
	}
});

app.get('/',function(req,res){
	var cookie_pass = req.cookies['auth'];
	if (passwordHash.verify('password', cookie_pass)) {
		res.sendFile(path.join(__dirname, 'ui', 'app.html'));
	} else {
		console.log('ok');
	}
});

app.get('/app', function(req, res){
	var cookie_pass = req.cookies['auth'];
	var cookie_otp = req.cookies['show'];

	if (!cookie_pass) {
		res.redirect('/');
		return;
	}

	if (!passwordHash.verify('password', cookie_pass)) {
		res.redirect('/');
		return;
	}
	
	if (cookie_otp) {
		// Initialize Web3 if not already done
		if (!global.web3) {
			console.log('Initializing Web3 with HTTP provider at http://127.0.0.1:8545');
			try {
				const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');
				global.web3 = new Web3(provider);
				
				// Test connection
				console.log('Testing Ethereum connection...');
				global.web3.eth.net.isListening()
					.then(isConnected => {
						if (isConnected) {
							console.log('Successfully connected to Ethereum network');
						} else {
							console.error('Cannot connect to Ethereum network');
						}
					})
					.catch(error => {
						console.error('Connection error:', error);
					});
			} catch (error) {
				console.error('Web3 initialization error:', error);
			}
		}

		// Check if we can connect to the blockchain
		console.log('Getting Ethereum accounts...');
		global.web3.eth.getAccounts()
			.then(accounts => {
				console.log('Available accounts:', accounts);
				
				// Deploy contract if not already deployed
				if (!global.deployedContract || !global.deployedContract.options || !global.deployedContract.options.address) {
					console.log("Deploying new contract...");
					
					// Read and compile contract
					deployContract(accounts[0]);
				} else {
					console.log('Using existing contract at:', global.deployedContract.options.address);
				}
				
				// Now serve the voting page
				res.sendFile(path.join(__dirname, 'ui', 'clist.html'));
			})
			.catch(error => {
				console.error('Error getting accounts:', error);
				res.status(500).send(`Error: ${error.message}. Please ensure Ganache is running and try again.`);
			});
	} else {
		res.sendFile(path.join(__dirname, 'ui', 'app.html'));
	}
});

// app.post('/getaddress',function(req,res){

// });

app.get('/info', function(req, res){
	var cookie_pass = req.cookies['auth'];
	var cookie_otp = req.cookies['show'];
	
	if (!cookie_pass || !cookie_otp) {
		res.redirect('/');
		return;
	}

	if (!passwordHash.verify('password', cookie_pass)) {
		res.redirect('/');
		return;
	}

	// Initialize Web3 if not already done
	if (!global.web3) {
		console.log('Initializing Web3 with HTTP provider at http://127.0.0.1:8545 (in /info route)');
		try {
			const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');
			global.web3 = new Web3(provider);
			
			// Test connection
			console.log('Testing Ethereum connection... (in /info route)');
			global.web3.eth.net.isListening()
				.then(isConnected => {
					if (isConnected) {
						console.log('Successfully connected to Ethereum network (in /info route)');
					} else {
						console.error('Cannot connect to Ethereum network (in /info route)');
					}
				})
				.catch(error => {
					console.error('Connection error in /info route:', error);
				});
		} catch (error) {
			console.error('Web3 initialization error in /info route:', error);
		}
	}

	// Check if we can connect to the blockchain
	console.log('Getting Ethereum accounts... (in /info route)');
	global.web3.eth.getAccounts()
		.then(accounts => {
			console.log('Available accounts in /info route:', accounts);
			
			// Deploy contract if not already deployed
			if (!global.deployedContract || !global.deployedContract.options || !global.deployedContract.options.address) {
				console.log("Deploying new contract from /info route...");
				
				// Read and compile contract
				deployContract(accounts[0]);
				
				// Respond immediately, don't wait for deployment
				console.log('Serving clist.html from /info route while contract deploys');
				res.sendFile(path.join(__dirname, 'ui', 'clist.html'));
			} else {
				console.log('Using existing contract at:', global.deployedContract.options.address, '(in /info route)');
				res.sendFile(path.join(__dirname, 'ui', 'clist.html'));
			}
		})
		.catch(error => {
			console.error('Error getting accounts in /info route:', error);
			res.status(500).send(`Error: ${error.message}. Please ensure Ganache is running and try again.`);
		});
});

// Add route to get contract address
app.get('/contract-address', function(req, res) {
	// Check if contract is deployed
	if (!global.deployedContract || !global.deployedContract.options || !global.deployedContract.options.address) {
		console.log('Contract not deployed yet when /contract-address was called');
		res.status(404).json({ error: 'Contract not deployed yet' });
		return;
	}
	
	// Return the address
	console.log('Returning contract address:', global.deployedContract.options.address);
	res.json({ address: global.deployedContract.options.address });
});

// Function to deploy the contract
async function deployContract(fromAccount) {
	console.log("=== STARTING CONTRACT DEPLOYMENT ===");
	try {
		// Read and compile contract
		console.log('Reading contract source code...');
		const contractSource = fs.readFileSync('Voting.sol').toString();
		
		// Use the old solc version API
		console.log('Compiling contract with solc 0.4.x...');
		const compiledCode = solc.compile(contractSource, 1);
		
		// Check for compilation errors - but ignore warnings
		if (compiledCode.errors) {
			console.log('Compilation produced warnings/errors:', compiledCode.errors);
			// Check if these are just warnings (they all contain "Warning:")
			const isOnlyWarnings = Array.isArray(compiledCode.errors) && 
				compiledCode.errors.every(error => error.includes('Warning:'));
			
			if (!isOnlyWarnings) {
				throw new Error('Contract compilation failed with errors: ' + compiledCode.errors);
			} else {
				console.log('Ignoring warnings and continuing with deployment');
			}
		}

		// Get contract data (using old solc API format)
		console.log('Getting contract data...');
		console.log('Contracts found:', Object.keys(compiledCode.contracts));
		const contractName = ':Voting';
		if (!compiledCode.contracts[contractName]) {
			throw new Error('Contract not found in compilation output');
		}
		
		const contractData = compiledCode.contracts[contractName];
		const abiDefinition = JSON.parse(contractData.interface);
		const byteCode = contractData.bytecode;
		
		// Create contract instance
		console.log('Creating contract instance...');
		const VotingContract = new global.web3.eth.Contract(abiDefinition);
		
		// Deploy contract with higher gas limit
		console.log('Preparing deployment with candidates:', ['Akshith','Teja','Surya','Yugendhar']);
		const deploy = VotingContract.deploy({
			data: '0x' + byteCode,
			arguments: [['Akshith','Teja','Surya','Yugendhar'].map(name => global.web3.utils.asciiToHex(name))]
		});

		// Use a fixed high gas limit for deployment
		const gasLimit = 6000000; // Higher gas limit for deployment
		
		// Send deployment transaction
		console.log('Sending deployment transaction with gas limit:', gasLimit, 'from account:', fromAccount);
		
		return deploy.send({
			from: fromAccount,
			gas: gasLimit
		})
		.then(deployedContract => {
			console.log('✓ Contract deployment transaction sent successfully');
			global.deployedContract = deployedContract;
			console.log('✓ global.deployedContract set to the deployed contract');
			console.log('✓ Contract deployed at address:', global.deployedContract.options.address);
			
			// Verify contract is deployed
			console.log('Verifying contract deployment...');
			return global.web3.eth.getCode(global.deployedContract.options.address);
		})
		.then(deployedBytecode => {
			if (deployedBytecode === '0x' || deployedBytecode === '0x0') {
				global.deployedContract = null;
				throw new Error('Contract deployment failed - no bytecode at contract address');
			}
			
			console.log('✓ Contract bytecode length:', deployedBytecode.length);
			console.log('✓ Contract successfully deployed and verified');
			
			// Test contract methods
			console.log('Testing contract methods...');
			return global.deployedContract.methods.candidateList(0).call();
		})
		.then(candidateList => {
			console.log('✓ First candidate from contract:', global.web3.utils.hexToAscii(candidateList));
			console.log("=== CONTRACT DEPLOYMENT COMPLETED SUCCESSFULLY ===");
			return global.deployedContract;
		})
		.catch(error => {
			console.error('XXX Deployment error:', error);
			global.deployedContract = null;
			console.error("=== CONTRACT DEPLOYMENT FAILED ===");
			throw error;
		});
		
	} catch (error) {
		console.error('XXX Deployment error:', error);
		global.deployedContract = null;
		console.error("=== CONTRACT DEPLOYMENT FAILED ===");
		throw error;
	}
}

// Start the server
var port = 8080;
app.listen(port, function () {
  console.log(`Voting app listening on port ${port}!`);
  console.log(`Open http://localhost:${port} in your browser to access the application`);
});
