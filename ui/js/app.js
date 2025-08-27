function isNumberKey(evt){
    var charCode = (evt.which) ? evt.which : event.keyCode
    if (charCode > 31 && (charCode < 48 || charCode > 57))
        return false;
    return true;
}

// window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('sign-in-button', {
//   'size': 'invisible',
//   'callback': function(response) {
//     // reCAPTCHA solved, allow signInWithPhoneNumber.
//     onSignInSubmit();
//   }
// });

// var recaptchaResponse = grecaptcha.getResponse(window.recaptchaWidgetId);
$('#verify_otp_model').hide()
$('#errorbox').hide()

// phone auth
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('getotp', {
      'size': 'invisible',
      'callback': function(response) {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        //onSignInSubmit();
        
      }
    });
    // [END appVerifier]

  recaptchaVerifier.render().then(function(widgetId) {
      window.recaptchaWidgetId = widgetId;
    //  updateSignInButtonUI();
    });

  var aadhaar_no_phone_no = {
  	"7382537xxxxx": "915801xxxx",
  	"300000000000": "7276xxxxxx",
	"<replace your aadhaar no here>": "<your phone number>",
  }


  function onSignInSubmit() {
    window.signingIn = true;
    $('#errorbox').hide();
    
    // Mock phone number from aadhaar mapping
    var phoneNumber = aadhaar_no_phone_no[$('#aadhaar_no').val()];
    if (!phoneNumber) {
        $('#errorbox').show();
        $('#error').text('Invalid Aadhaar number');
        return;
    }

    // For testing - using fixed OTP: 123456
    window.confirmationResult = {
        confirm: function(code) {
            return new Promise((resolve, reject) => {
                if (code === '123456') {
                    resolve({
                        user: {
                            uid: 'test-user-' + $('#aadhaar_no').val()
                        }
                    });
                } else {
                    reject(new Error('Invalid OTP'));
                }
            });
        }
    };

    var d = new Date();
    d.setTime(d.getTime() + (1*24*60*60*1000));      
    var expires = "expires="+ d.toUTCString();
    document.cookie = 'aadhaar' + "=" + $('#aadhaar_no').val() + ";" + expires + ";path=/";

    $('#verifyc').text('Enter verification code (use: 123456)');
    $('#enter_aadhaarno').hide();
    $('#verify_otp_model').show();
    console.log('otp ready for verification');
}
// Phone auth end //

$(verifyotp).click(function(){
		var code = $('#verify_otp').val()
      	confirmationResult.confirm(code).then(function (result) {
        // User signed in successfully.
        var user = result.user;
        window.verifyingCode = false;
        //login success
        console.log(user.uid);
        var d = new Date();
    	d.setTime(d.getTime() + (1*24*60*60*1000));      
    	var expires = "expires="+ d.toUTCString();
    	document.cookie = 'show' + "=" + user.uid + ";" + expires + ";path=/";
    	window.location = '/info'

      }).catch(function (error) {
        // User couldn't sign in (bad verification code?)
        console.error('Error while checking the verification code', error);
        window.alert('Error while checking the verification code:\n\n'
           + error.code + '\n\n' + error.message);
        window.verifyingCode = false;
        $('#errorbox').show()
		$('#error').text('Enter valid OTP')
      });
});


$(getotp).click(function(){
	if ($('#aadhaar_no').val()=="") {
		$('#errorbox').show()
		$('#error').text('Please Enter Aadhaar No')

    }
    else{
    	onSignInSubmit();
    	$('#errorbox').hide()
    }
});
