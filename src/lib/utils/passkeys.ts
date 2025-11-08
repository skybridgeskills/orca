//hm: put passkey items in here. also install prettier and sherlock
import { generateAuthenticationOptions, verifyRegistrationResponse } from "@simplewebauthn/server"
import {generateRegistrationOptions} from "@simplewebauthn/server"
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import {verifyAuthenticationResponse} from '@simplewebauthn/server';

import { type User } from '@prisma/client';


const rpName = 'Orca';

let originURLHost = "localhost:5173";
let originURLProtocol = 'http://'
	if (typeof window !== 'undefined') {
	originURLHost = window.location.host; 
	originURLProtocol = window.location.protocol; 
} 

//hm: user specific - for a user that is signed in

export const createRegistrationOptionsForUser = async (user: App.UserData, relayingPartyId: string) => {


    const options = await generateRegistrationOptions({
        rpName,
        rpID: relayingPartyId,
        userName: user.identifiers[0].identifier, 
        attestationType: 'none',
        authenticatorSelection: {
          // Defaults
          residentKey: 'preferred',
          userVerification: 'preferred',
          // Optional
          authenticatorAttachment: 'platform',
        },
      });

      return options;
};

export const verifyUserPasskey = async (response: any, challenge: string, url: string) => {
  const verification = await verifyRegistrationResponse({
    response: response,
    expectedChallenge: challenge,
    expectedOrigin: url
    })

    return verification
}


//hm: Authentication/Login, after passkeys are saved to the user(?)


export const createAuthenticationOptionsForUser = async (relayingPartyId: string) => {
  
  const options = await generateAuthenticationOptions({
    rpID: relayingPartyId,
    allowCredentials: []
  });
return options;
};

export const setRegistrationOptionsForUser = async (user:User, options: any) => {

   // setCurrentRegistrationOptions(user, options);

    return options;
}



export const verifyUserResponseAuth = async (verifyRPID: string, challenge: any, verify_response: any, credential: any) => {

    verify_response = JSON.parse(verify_response)
    challenge = JSON.parse(challenge)
    console.log(credential.publicKey)

    let array_pubkey = [];


    for(let i = 0; i < 77 ;i++ ) {
      array_pubkey.push(credential.publicKey[i])
    }

    const pubkey_uint = new Uint8Array(array_pubkey) 
    
   const authVerify = await verifyAuthenticationResponse({
    response: verify_response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: originURLProtocol + "//" + originURLHost,
    expectedRPID: verifyRPID,
    credential: {
      id: credential.id,
      publicKey: pubkey_uint,
      counter: credential.counter,
      transports: credential.transports
    }
  })

  return authVerify
  
}
