url = new URL(window.location.href);

if (url.searchParams.get('pub')) {
	console.log('Using Pub Network!')
	const server_url = "https://horizon.stellar.org"
	server = new stellar.Server(server_url);
	passphrase = stellar.Networks.PUBLIC
	network = "public"
} else {
	const server_url = 'https://horizon-testnet.stellar.org'
	server = new stellar.Server(server_url);
	passphrase = stellar.Networks.TESTNET
	network = "testnet"
}

let publicKey = undefined
let wallet = undefined

async function loginWithFreighter(){
	await freighter.getPublicKey()
    .then(res => {
    	console.log(res)
    	publicKey = res
    	wallet = "freighter"
    	renderClaimableBalances()
    	document.querySelector('.login').style.display='none'
    	document.querySelector('.balances').style.display='block'
    })
}

async function loginWithAlbedo(){
	albedo.publicKey({
    	token: 'iWOtWb4pdBOVpx0dF6PyqVsJ9JDo8lkARRkTtEH/Qcg='
	})
    .then(res => {
    	console.log(res.pubkey, res.signed_message, res.signature)
    	publicKey = res.pubkey
    	wallet = "albedo"
    	renderClaimableBalances()
    	document.querySelector('.login').style.display='none'
    	document.querySelector('.balances').style.display='block'
    })
}

async function renderClaimableBalances(){
	document.querySelector('#pubKey').innerText=`Account: ${publicKey}`
	let balances = await server
    .claimableBalances()
    .claimant(publicKey)
    .limit(1)       // there may be many in general
    .order("desc")  // so always get the latest one
    .call()
    .catch(function(err) {
      console.error(`Claimable balance retrieval failed: ${err}`)
 	})
    console.log(balances)
    let tbodyRef = document.querySelector('tbody')

    if(balances['records'].length == 0){
    	document.querySelector('table').remove()
    	let textNode = document.createElement('h6')
    	textNode.innerText='No Claimable balances have been found'
    	document.querySelector('.striped').appendChild(textNode)
    }

    balances['records'].forEach(elem => {
    	let asset = elem['asset'].split(':')
 		// Insert a row at the end of table
		let newRow = tbodyRef.insertRow();

		// Insert a cell at the end of the row
		let sponsorCell = newRow.insertCell();
		let dateCell = newRow.insertCell();
		let assetCell = newRow.insertCell();
		let issuerCell = newRow.insertCell();
		let actionCell = newRow.insertCell();

		// Append a text node to the cell
		let sponsorText = document.createTextNode(elem['sponsor']); // Sponsor
		let dateText = document.createTextNode(elem['last_modified_time']); // Modified time
		let assetText = document.createTextNode(asset[0]); // Sponsor
		let issuerText = document.createTextNode(asset[1]); // Sponsor

		sponsorCell.appendChild(sponsorText);
		dateCell.appendChild(dateText);
		assetCell.appendChild(assetText);
		issuerCell.appendChild(issuerText);

		// Generate XDR

		const claimButton = document.createElement("button");
		claimButton.setAttribute('class', 'waves-effect waves-light btn claim-button')
		claimButton.setAttribute('onclick', `claimBalance`)
		claimButton.setAttribute('x-balance-id', elem['id'])
		claimButton.innerText = "Claim"

		actionCell.appendChild(claimButton)
    	console.log(elem)
    })
	document.querySelectorAll(".claim-button").forEach(elem => elem.addEventListener("click", claimBalance))
}

async function claimBalance(event){
	var source = event.target || event.srcElement;
	const balanceId = event.target.getAttribute('x-balance-id')
	console.log(source);

	 let aAccount = await server.loadAccount(publicKey).catch(function (err) {
    	alert(`Failed to load ${publicKey}: ${err}`)
  	})
  	if (!aAccount) { return }
  	let claimBalance = stellar.Operation.claimClaimableBalance({ balanceId: balanceId });

    let tx = new stellar.TransactionBuilder(aAccount, {fee: stellar.BASE_FEE})
    .addOperation(claimBalance)
    .setNetworkPassphrase(passphrase)
    .setTimeout(180)
    .build()
    .toXDR();

    if(wallet = freighter){
    	signedTransaction = await freighter.signTransaction(tx, network.toUpperCase());

    	const transactionToSubmit = stellar.TransactionBuilder.fromXDR(signedTransaction, server_url)

    	console.log(transactionToSubmit)

		const response = await server.submitTransaction(transactionToSubmit)

		console.log(response)
    }
    else {
	    await albedo.tx({
		    xdr: tx,
		    network: network,
		    submit: true
		}).then(res => console.log(res.xdr, res.tx_hash, res.signed_envelope_xdr, res.network, res.result))
	}
    document.querySelector('tbody').remove();
	let new_tbody = document.createElement('tbody');
	document.querySelector('table').appendChild(new_tbody);
    renderClaimableBalances()

}

document.querySelector("#albedo-button").addEventListener("click", loginWithAlbedo)
if (freighter.isConnected()) {
	document.querySelector("#freighter-button").style.display='block'
	document.querySelector("#freighter-button").addEventListener("click", loginWithFreighter)
}