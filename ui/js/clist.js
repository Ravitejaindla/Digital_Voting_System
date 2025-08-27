$(document).ready(function() {
$('.modal').modal();
	// $.ajax({
 //    url: '/getaddress',
 //    method: 'post'
	// }).done(function(){
	// 	console.log('done');
	// });

	// Initialize Web3
	async function initWeb3() {
		try {
			if (typeof window.ethereum !== 'undefined') {
				console.log('Using MetaMask/Modern Web3 provider');
				const web3 = new Web3(window.ethereum);
				try {
					await window.ethereum.request({ method: 'eth_requestAccounts' });
					return web3;
				} catch (error) {
					console.error("User denied account access");
					throw error;
				}
			} else {
				console.log('Using local Web3 provider');
				const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
				const web3 = new Web3(provider);
				
				// Test connection using Promise-based approach
				return web3.eth.net.isListening()
					.then(isListening => {
						if (!isListening) {
							throw new Error('Cannot connect to Ethereum network');
						}
						console.log('Successfully connected to local Ethereum network');
						return web3;
					})
					.catch(error => {
						console.error('Connection error:', error);
						throw new Error('Cannot connect to Ethereum network. Please ensure Ganache is running.');
					});
			}
		} catch (error) {
			console.error('Web3 initialization error:', error);
			throw error;
		}
	}

	// Initialize contract
	async function initContract() {
		try {
			console.log('Initializing Web3...');
			const web3 = await initWeb3();
			
			console.log('Getting contract address...');
			try {
				const response = await fetch('/contract-address');
				console.log('Response status:', response.status);
				
				if (!response.ok) {
					throw new Error(`Server returned ${response.status}: ${response.statusText}`);
				}
				
				const data = await response.json();
				console.log('Contract data from server:', data);
				
				if (data.error) {
					console.error('Server reported error:', data.error);
					throw new Error(data.error);
				}
				
				if (!data.address) {
					console.error('No contract address in response');
					throw new Error('Contract address not available');
				}

				console.log('Got contract address:', data.address);
				
				// Initialize contract ABI
				const abi = JSON.parse('[{"constant":false,"inputs":[{"name":"candidate","type":"bytes32"}],"name":"totalVotesFor","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"candidate","type":"bytes32"}],"name":"validCandidate","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"votesReceived","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"x","type":"bytes32"}],"name":"bytes32ToString","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"candidateList","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"candidate","type":"bytes32"}],"name":"voteForCandidate","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"contractOwner","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"inputs":[{"name":"candidateNames","type":"bytes32[]"}],"payable":false,"type":"constructor"}]');
				
				// Create contract instance
				const contract = new web3.eth.Contract(abi, data.address);
				
				console.log('Verifying contract deployment...');
				try {
					const code = await web3.eth.getCode(data.address);
					console.log('Contract bytecode length:', code.length);
					
					if (code === '0x' || code === '0x0') {
						console.error('No bytecode at contract address');
						throw new Error('Contract not deployed properly');
					}
					
					// Test contract call
					console.log('Testing contract call...');
					try {
						const candidateList = await contract.methods.candidateList(0).call();
						console.log('Contract test successful. First candidate:', web3.utils.hexToAscii(candidateList));
						
						// Initialize the status message
						$('#loc_info').text('Contract initialized successfully');
						
						return contract;
					} catch (callError) {
						console.error('Contract method call error:', callError);
						throw new Error('Contract method call failed: ' + callError.message);
					}
				} catch (codeError) {
					console.error('Contract code verification error:', codeError);
					throw new Error('Contract verification failed: ' + codeError.message);
				}
			} catch (fetchError) {
				console.error('Fetch contract address error:', fetchError);
				throw new Error('Failed to fetch contract address: ' + fetchError.message);
			}
		} catch (error) {
			console.error('Contract initialization error:', error);
			$('#loc_info').text('Error: ' + error.message);
			throw new Error('Failed to initialize contract: ' + error.message);
		}
	}

	// Handle voting
	async function vote(candidateName) {
		try {
			$('#loc_info').text('Initializing Web3...');
			console.log('Vote function: Initializing Web3...');
			const web3 = await initWeb3();
			
			$('#loc_info').text('Initializing contract...');
			console.log('Vote function: Initializing contract...');
			const contract = await initContract();
			
			$('#loc_info').text('Getting account access...');
			console.log('Vote function: Getting accounts...');
			const accounts = await web3.eth.getAccounts();
			console.log('Available accounts:', accounts);
			
			if (!accounts || accounts.length === 0) {
				console.error('No accounts available');
				throw new Error('No accounts available. Is Ganache running?');
			}

			$('#loc_info').text('Submitting vote transaction...');
			const candidateBytes = web3.utils.asciiToHex(candidateName);
			console.log('Vote function: Candidate bytes:', candidateBytes);
			
			// Verify candidate exists before voting
			console.log('Vote function: Verifying candidate...');
			try {
				const isValid = await contract.methods.validCandidate(candidateBytes).call();
				console.log('Is candidate valid?', isValid);
				
				if (!isValid) {
					throw new Error('Invalid candidate');
				}
				
				console.log('Vote function: Submitting transaction...');
				$('#loc_info').text('Submitting vote to blockchain...');
				
				const tx = await contract.methods.voteForCandidate(candidateBytes)
					.send({ 
						from: accounts[0],
						gas: 200000 // Provide sufficient gas for voting
					});
				
				console.log('Vote transaction successful:', tx);
				$('#loc_info').text('Vote submitted successfully for ' + candidateName);
				alert('Vote submitted successfully for ' + candidateName);
				disable();
			} catch (voteError) {
				console.error('Voting error:', voteError);
				throw new Error('Error during voting process: ' + voteError.message);
			}
		} catch (error) {
			console.error('Error in vote function:', error);
			$('#loc_info').text('Error: ' + error.message);
			alert('Error submitting vote: ' + error.message);
		}
	}

	//check cookie
	function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
	}

	var aadhaar_list = {
		"300000000000" : "Teja",
		"738253790005" : "Ravi"
	}

	var aadhaar = readCookie('aadhaar');
	console.log(aadhaar);
	var address = aadhaar_list[aadhaar];
	console.log(address);
	$('#loc_info').text('Location based on Aadhaar : '+ address)

	function disable() {
		$('#vote1').addClass("disabled");
		$('#vote2').addClass("disabled");
		$('#vote3').addClass("disabled");
		$('#vote4').addClass("disabled");
		    
		    //logout
		document.cookie = "show=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
		document.cookie = "aadhaar=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
		setTimeout(() => {
		    window.location = '/app';
		}, 2000);
	}

	// Click handlers
	$('#vote1').click(() => vote('Akshith'));
	$('#vote2').click(() => vote('Teja'));
	$('#vote3').click(() => vote('Surya'));
	$('#vote4').click(() => vote('Yugendhar'));
});