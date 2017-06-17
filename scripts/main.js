/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Initializes MelanomaDoctor.
function MelanomaDoctor() {
    this.checkSetup();

    // Shortcuts to DOM Elements.
    this.messageList = document.getElementById('messages');
    this.messageForm = document.getElementById('message-form');
    this.messageInput = document.getElementById('message');
    this.submitButton = document.getElementById('submit');
    this.submitImageButton = document.getElementById('submitImage');
    this.imageForm = document.getElementById('image-form');
    this.mediaCapture = document.getElementById('mediaCapture');
    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');
    this.signInSnackbar = document.getElementById('must-signin-snackbar');

    // Saves message on form submit.
    this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
    this.signOutButton.addEventListener('click', this.signOut.bind(this));
    this.signInButton.addEventListener('click', this.signIn.bind(this));

    // Toggle for the button.
    var buttonTogglingHandler = this.toggleButton.bind(this);
    this.messageInput.addEventListener('keyup', buttonTogglingHandler);
    this.messageInput.addEventListener('change', buttonTogglingHandler);

    // Events for image upload.
    this.submitImageButton.addEventListener('click', function (e) {
        e.preventDefault();
        this.mediaCapture.click();
    }.bind(this));
    this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

    this.initFirebase();

    this.displayMessage(MelanomaDoctor.WELCOME_MESSAGE.key, MelanomaDoctor.WELCOME_MESSAGE.name,
        MelanomaDoctor.WELCOME_MESSAGE.text, MelanomaDoctor.WELCOME_MESSAGE.picUrl);
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
MelanomaDoctor.prototype.initFirebase = function () {
    // Shortcuts to Firebase SDK features.
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// Loads chat messages history and listens for upcoming ones.
MelanomaDoctor.prototype.loadMessages = function () {
    // Reference to the /messages/ database path.
    this.messagesRef = this.database.ref('messages');
    // Make sure we remove all previous listeners.
    this.messagesRef.off();

    // Loads the last 12 messages and listen for new ones.
    var setMessage = function (data) {
        var val = data.val();
        this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
    }.bind(this);
    this.messagesRef.limitToLast(12).on('child_added', setMessage);
    this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

// Saves a new message on the Firebase DB.
MelanomaDoctor.prototype.saveMessage = function (e) {
    e.preventDefault();
    // Check that the user entered a message and is signed in.
    if (this.messageInput.value && this.checkSignedInWithMessage()) {
        var currentUser = this.auth.currentUser;
        // Add a new message entry to the Firebase Database.
        this.messagesRef.push({
            name: currentUser.displayName,
            text: this.messageInput.value,
            photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
        }).then(function () {
            // Clear message text field and SEND button state.
            MelanomaDoctor.resetMaterialTextfield(this.messageInput);
            this.toggleButton();
        }.bind(this)).catch(function (error) {
            console.error('Error writing new message to Firebase Database', error);
        });
    }
};

// Sets the URL of the given img element with the URL of the image stored in Cloud Storage.
MelanomaDoctor.prototype.setImageUrl = function (imageUri, imgElement) {
    // If the image is a Cloud Storage URI we fetch the URL.
    if (imageUri.startsWith('gs://')) {
        imgElement.src = MelanomaDoctor.LOADING_IMAGE_URL; // Display a loading image first.
        this.storage.refFromURL(imageUri).getMetadata().then(function (metadata) {
            imgElement.src = metadata.downloadURLs[0];
        });
    } else {
        imgElement.src = imageUri;
    }
};

// Saves a new message containing an image URI in Firebase.
// This first saves the image in Firebase storage.
MelanomaDoctor.prototype.saveImageMessage = function (event) {
    event.preventDefault();
    var file = event.target.files[0];

    // Clear the selection in the file picker input.
    this.imageForm.reset();

    // Check if the file is an image.
    if (!file.type.match('image.*')) {
        var data = {
            message: 'You can only share images',
            timeout: 2000
        };
        this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
        return;
    }
    // Check if the user is signed-in
    // Check if the user is signed-in
    if (this.checkSignedInWithMessage()) {

        // We add a message with a loading icon that will get updated with the shared image.
        var currentUser = this.auth.currentUser;
        this.messagesRef.push({
            name: currentUser.displayName,
            imageUrl: MelanomaDoctor.LOADING_IMAGE_URL,
            photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
        }).then(function (data) {

            // Upload the image to Cloud Storage.
            var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
            return this.storage.ref(filePath).put(file).then(function (snapshot) {

                // Get the file's Storage URI and update the chat message placeholder.
                var fullPath = snapshot.metadata.fullPath;
                return data.update({imageUrl: this.storage.ref(fullPath).toString()});
            }.bind(this));
        }.bind(this)).catch(function (error) {
            console.error('There was an error uploading a file to Cloud Storage:', error);
        });
    }
};

// Signs-in Melanoma Doctor.
MelanomaDoctor.prototype.signIn = function () {
    // Sign in Firebase using popup auth and Google as the identity provider.
    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
};

// Signs-out of Melanoma Doctor.
MelanomaDoctor.prototype.signOut = function () {
    // Sign out of Firebase.
    this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
MelanomaDoctor.prototype.onAuthStateChanged = function (user) {
    console.log(user);
    if (user) { // User is signed in!
        // Get profile pic and user's name from the Firebase user object.
        var profilePicUrl = user.photoURL;   // Get profile pic.
        var userName = user.displayName;        // Get user's name.

        // Set the user's profile pic and name.
        this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
        this.userName.textContent = userName;

        // Show user's profile and sign-out button.
        this.userName.removeAttribute('hidden');
        this.userPic.removeAttribute('hidden');
        this.signOutButton.removeAttribute('hidden');

        // Hide sign-in button.
        this.signInButton.setAttribute('hidden', 'true');

        // We load currently existing chant messages.
        this.loadMessages();

        // We save the Firebase Messaging Device token and enable notifications.
        this.saveMessagingDeviceToken();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        this.userName.setAttribute('hidden', 'true');
        this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');

        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');
    }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
MelanomaDoctor.prototype.checkSignedInWithMessage = function () {
    // Return true if the user is signed in Firebase
    if (this.auth.currentUser) {
        return true;
    }

    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};

// Saves the messaging device token to the datastore.
MelanomaDoctor.prototype.saveMessagingDeviceToken = function () {
    // TODO(DEVELOPER): Save the device token in the realtime datastore
};

// Requests permissions to show notifications.
MelanomaDoctor.prototype.requestNotificationsPermissions = function () {
    // TODO(DEVELOPER): Request permissions to send notifications.
};

// Resets the given MaterialTextField.
MelanomaDoctor.resetMaterialTextfield = function (element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

MelanomaDoctor.WELCOME_MESSAGE = {
    'key': 'system',
    'name': ' Melanoma Doctor',
    'text': 'Welcome! I am your Melanoma Doctor. Please take a picture and I will do my best to tell you if this is a benign or malignant mole.',
    'picUrl': 'data:image/jpeg;base64,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'
};

// Template for messages.
MelanomaDoctor.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
    '<div class="spacing"><div class="pic"></div></div>' +
    '<div class="message"></div>' +
    '<div class="name"></div>' +
    '</div>';

// A loading image URL.
MelanomaDoctor.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Displays a Message in the UI.
MelanomaDoctor.prototype.displayMessage = function (key, name, text, picUrl, imageUri) {
    var div = document.getElementById(key);
    // If an element for that message does not exists yet we create it.
    if (!div) {
        var container = document.createElement('div');
        container.innerHTML = MelanomaDoctor.MESSAGE_TEMPLATE;
        div = container.firstChild;
        div.setAttribute('id', key);
        this.messageList.appendChild(div);
    }
    if (picUrl) {
        div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
    }
    div.querySelector('.name').textContent = name;
    var messageElement = div.querySelector('.message');
    if (text) { // If the message is text.
        messageElement.textContent = text;
        // Replace all line breaks by <br>.
        messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    } else if (imageUri) { // If the message is an image.
        var image = document.createElement('img');
        image.addEventListener('load', function () {
            this.messageList.scrollTop = this.messageList.scrollHeight;
        }.bind(this));
        this.setImageUrl(imageUri, image);
        messageElement.innerHTML = '';
        messageElement.appendChild(image);
    }
    // Show the card fading-in.
    setTimeout(function () {
        div.classList.add('visible')
    }, 1);
    this.messageList.scrollTop = this.messageList.scrollHeight;
    this.messageInput.focus();
};

// Enables or disables the submit button depending on the values of the input
// fields.
MelanomaDoctor.prototype.toggleButton = function () {
    if (this.messageInput.value) {
        this.submitButton.removeAttribute('disabled');
    } else {
        this.submitButton.setAttribute('disabled', 'true');
    }
};

// Checks that the Firebase SDK has been correctly setup and configured.
MelanomaDoctor.prototype.checkSetup = function () {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions and make ' +
            'sure you are running the codelab using `firebase serve`');
    }
};

window.onload = function () {
    window.melanomaDoctor = new MelanomaDoctor();
};
