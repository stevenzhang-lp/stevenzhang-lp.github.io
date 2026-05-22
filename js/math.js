document.addEventListener('DOMContentLoaded', () => {
	// ==========================================
	// 0. Mobile Device Redirection Check
	// ==========================================
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
		|| window.innerWidth < 1024;
	
	if (isMobile) {
		let currentLang = localStorage.getItem('voyage_lang') || 'zh';
		const zhMsg = "该常用数学工作台仅支持在电脑端（宽屏）访问。";
		const enMsg = "The Mathematical Workbench is only supported on desktop screens.";
		alert(currentLang === 'en' ? enMsg : zhMsg);
		window.location.href = 'vault.html';
		return;
	}

	// ==========================================
	// 1. Language Toggle & Initialization
	// ==========================================
	const langToggle = document.getElementById('lang-toggle');
	let currentLang = localStorage.getItem('voyage_lang') || 'zh';
	document.body.classList.remove('lang-zh', 'lang-en');
	document.body.classList.add(`lang-${currentLang}`);

	function updateTitle(lang) {
		document.title = lang === 'en' ? "STEVEN ZHANG | MATH WORKBENCH" : "STEVEN ZHANG | 常用数学工作台";
	}
	updateTitle(currentLang);

	if (langToggle) {
		langToggle.addEventListener('click', (e) => {
			e.preventDefault();
			let newLang = document.body.classList.contains('lang-zh') ? 'en' : 'zh';
			document.body.classList.remove('lang-zh', 'lang-en');
			document.body.classList.add(`lang-${newLang}`);
			localStorage.setItem('voyage_lang', newLang);
			updateTitle(newLang);
		});
	}

	// Helper to check language in JS calculations
	function isEnglish() {
		return document.body.classList.contains('lang-en');
	}


	// ==========================================
	// 2. Module 1: Function Plotter (Desmos)
	// ==========================================
	// Implemented directly via embedded iframe and direct link in math.html.
	// No local plotting calculations are needed anymore.


	// ==========================================
	// 3. Module 2: LaTeX Formula Converter
	// ==========================================
	// Implemented directly via portal link in math.html.


	// ==========================================
	// 4. Module 3: Base Converter & Bitwise Sandbox
	// ==========================================
	const convInput = document.getElementById('conv-input');
	const convBin = document.getElementById('conv-bin');
	const convOct = document.getElementById('conv-oct');
	const convDec = document.getElementById('conv-dec');
	const convHex = document.getElementById('conv-hex');

	const bitValA = document.getElementById('bit-val-a');
	const bitValB = document.getElementById('bit-val-b');
	const bitOp = document.getElementById('bit-op');
	const bitVisualOut = document.getElementById('bit-visual-out');

	// Helper to parse integers in DEC, HEX (0xNN), or BIN (0bNN)
	function parseFlexibleInt(str) {
		str = str.trim();
		if (!str) return NaN;
		
		if (str.toLowerCase().startsWith('0x')) {
			return parseInt(str.substring(2), 16);
		} else if (str.toLowerCase().startsWith('0b')) {
			return parseInt(str.substring(2), 2);
		} else if (str.toLowerCase().startsWith('0o')) {
			return parseInt(str.substring(2), 8);
		}
		return parseInt(str, 10);
	}

	// Update base converter panel
	function updateBaseConverter() {
		const val = parseFlexibleInt(convInput.value);
		if (isNaN(val)) {
			convBin.textContent = 'Invalid';
			convOct.textContent = 'Invalid';
			convDec.textContent = 'Invalid';
			convHex.textContent = 'Invalid';
			return;
		}

		// Bin representation (show 32 bits, padding zeros)
		let binStr = (val >>> 0).toString(2);
		if (binStr.length < 8) binStr = binStr.padStart(8, '0');
		convBin.textContent = binStr;

		convOct.textContent = val.toString(8);
		convDec.textContent = val.toString(10);
		convHex.textContent = val.toString(16).toUpperCase();
	}

	// Formats a 32-bit integer binary with space groups
	function to32BitBinString(num) {
		const bits = (num >>> 0).toString(2).padStart(32, '0');
		const groups = [];
		for (let i = 0; i < 32; i += 8) {
			groups.push(bits.substring(i, i + 8));
		}
		return groups.join(' ');
	}

	// Update bitwise visualizer alignment display
	function updateBitwiseVisualizer() {
		const a = parseFlexibleInt(bitValA.value);
		const b = parseFlexibleInt(bitValB.value);
		const op = bitOp.value;

		if (isNaN(a)) {
			bitVisualOut.textContent = 'Value A is invalid.';
			return;
		}

		let result;
		let showB = true;
		let opSymbol = '';

		switch (op) {
			case 'AND':
				result = a & b;
				opSymbol = '&';
				break;
			case 'OR':
				result = a | b;
				opSymbol = '|';
				break;
			case 'XOR':
				result = a ^ b;
				opSymbol = '^';
				break;
			case 'NOT':
				result = ~a;
				showB = false;
				opSymbol = '~';
				break;
			case 'SHL':
				result = a << b;
				opSymbol = '<<';
				break;
			case 'SHR':
				result = a >> b;
				opSymbol = '>>';
				break;
		}

		if (showB && isNaN(b)) {
			bitVisualOut.textContent = 'Value B is invalid.';
			return;
		}

		// Draw bitwise alignment
		const valAStr = a.toString(10);
		const valBStr = showB ? b.toString(10) : '';
		const resStr = result.toString(10);

		let visualHtml = '';
		if (op === 'NOT') {
			visualHtml = `A (${valAStr}):   ${to32BitBinString(a)}\n`;
			visualHtml += `~A (NOT):      ${to32BitBinString(result)}\n\n`;
			visualHtml += `Result (DEC):  ${resStr}\n`;
			visualHtml += `Result (HEX):  0x${(result >>> 0).toString(16).toUpperCase()}`;
		} else {
			visualHtml = `A (${valAStr}):   ${to32BitBinString(a)}\n`;
			visualHtml += `${opSymbol} B (${valBStr}):   ${to32BitBinString(b)}\n`;
			visualHtml += `-------------------------------------------\n`;
			visualHtml += `Res (${resStr}): ${to32BitBinString(result)}\n\n`;
			visualHtml += `Result (HEX):  0x${(result >>> 0).toString(16).toUpperCase()}`;
		}

		bitVisualOut.textContent = visualHtml;
	}

	convInput.addEventListener('input', updateBaseConverter);
	[bitValA, bitValB, bitOp].forEach(el => el.addEventListener('input', updateBitwiseVisualizer));

	// Initial runs
	updateBaseConverter();
	updateBitwiseVisualizer();


	// ==========================================
	// 5. Module 4: Cryptographic Sandbox
	// ==========================================
	const hashInput = document.getElementById('hash-input');
	const hashOutput = document.getElementById('hash-output');

	const tabHash = document.getElementById('crypto-tab-hash');
	const tabAes = document.getElementById('crypto-tab-aes');
	const panelHash = document.getElementById('crypto-panel-hash');
	const panelAes = document.getElementById('crypto-panel-aes');

	// Tab toggles
	tabHash.addEventListener('click', () => {
		tabHash.classList.add('active');
		tabAes.classList.remove('active');
		panelHash.classList.add('active');
		panelAes.classList.remove('active');
	});

	tabAes.addEventListener('click', () => {
		tabAes.classList.add('active');
		tabHash.classList.remove('active');
		panelAes.classList.add('active');
		panelHash.classList.remove('active');
	});

	// SHA-256 Utility using Web Crypto
	async function computeSha256(text) {
		const encoder = new TextEncoder();
		const data = encoder.encode(text);
		const hashBuf = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuf));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	// Hash input handler
	hashInput.addEventListener('input', async () => {
		const text = hashInput.value;
		if (!text) {
			hashOutput.textContent = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty hash
			return;
		}
		try {
			const hash = await computeSha256(text);
			hashOutput.textContent = hash;
		} catch (err) {
			hashOutput.textContent = `Error: ${err.message}`;
		}
	});

	// AES-GCM Encryption / Decryption Utilities
	const aesPass = document.getElementById('aes-pass');
	const aesPlain = document.getElementById('aes-plain');
	const aesResult = document.getElementById('aes-result');
	const aesEncryptBtn = document.getElementById('aes-encrypt-btn');
	const aesDecryptBtn = document.getElementById('aes-decrypt-btn');

	// Key derivation from passphrase
	async function deriveAesKey(passphrase, salt) {
		const encoder = new TextEncoder();
		const baseKey = await crypto.subtle.importKey(
			"raw",
			encoder.encode(passphrase),
			"PBKDF2",
			false,
			["deriveKey"]
		);
		return crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: salt,
				iterations: 100000,
				hash: "SHA-256"
			},
			baseKey,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"]
		);
	}

	// Encrypt Plaintext
	async function encryptAesGcm(plaintext, passphrase) {
		const encoder = new TextEncoder();
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const key = await deriveAesKey(passphrase, salt);

		const ciphertextBuffer = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			encoder.encode(plaintext)
		);

		// Combine Salt + IV + Ciphertext into single payload
		const combined = new Uint8Array(salt.length + iv.length + ciphertextBuffer.byteLength);
		combined.set(salt, 0);
		combined.set(iv, salt.length);
		combined.set(new Uint8Array(ciphertextBuffer), salt.length + iv.length);

		// Format as Hex string
		return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	// Decrypt Hex
	async function decryptAesGcm(hexString, passphrase) {
		// Clean up hex
		const hex = hexString.trim();
		if (hex.length % 2 !== 0) throw new Error("Invalid hex length.");

		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}

		if (bytes.length < 28) {
			throw new Error("Ciphertext too short (must contain Salt + IV + Data).");
		}

		// Unpack bytes
		const salt = bytes.slice(0, 16);
		const iv = bytes.slice(16, 28);
		const ciphertext = bytes.slice(28);

		const key = await deriveAesKey(passphrase, salt);
		const decryptedBuffer = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			ciphertext
		);

		return new TextDecoder().decode(decryptedBuffer);
	}

	aesEncryptBtn.addEventListener('click', async () => {
		const plaintext = aesPlain.value;
		const keyphrase = aesPass.value;

		if (!plaintext) {
			aesResult.textContent = isEnglish() ? 'Please provide plain text.' : '请输入明文字符串。';
			return;
		}

		if (!keyphrase) {
			aesResult.textContent = isEnglish() ? 'Passphrase is required.' : '需要密钥口令。';
			return;
		}

		aesResult.textContent = isEnglish() ? 'Encrypting...' : '加密中...';

		try {
			const hexCipher = await encryptAesGcm(plaintext, keyphrase);
			aesResult.textContent = hexCipher;
		} catch (err) {
			aesResult.innerHTML = `<span style="color:#ff5555;">${isEnglish() ? 'Encryption failed' : '加密失败'}: ${err.message}</span>`;
		}
	});

	aesDecryptBtn.addEventListener('click', async () => {
		const hexCipher = aesResult.textContent.trim();
		const keyphrase = aesPass.value;

		if (!hexCipher || hexCipher.includes(' ') || hexCipher.includes('Encrypting') || hexCipher.includes('failed') || hexCipher.includes('Press')) {
			aesResult.textContent = isEnglish() 
				? 'No valid ciphertext found in results. Encrypt a message first.' 
				: '结果中无有效十六进制密文，请先加密。';
			return;
		}

		if (!keyphrase) {
			aesResult.textContent = isEnglish() ? 'Passphrase is required.' : '需要密钥口令。';
			return;
		}

		aesResult.textContent = isEnglish() ? 'Decrypting...' : '解密中...';

		try {
			const decrypted = await decryptAesGcm(hexCipher, keyphrase);
			aesResult.textContent = decrypted;
		} catch (err) {
			aesResult.innerHTML = `<span style="color:#ff5555;">${isEnglish() ? 'Decryption failed' : '解密失败'}: ${err.message}</span>`;
		}
	});
});
