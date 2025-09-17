//hm: put passkey items in here. also install prettier and sherlock
import { generateAuthenticationOptions, verifyRegistrationResponse } from "@simplewebauthn/server"
import {generateRegistrationOptions} from "@simplewebauthn/server"
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import {
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import { type User } from '@prisma/client';

const rpName = 'Orca';
const rpID = "localhost"; //domain

//hm: user specific - for a user that is signed in

export const createRegistrationOptionsForUser = async (user: App.UserData, relayingPartyId: string) => {

    const options = await generateRegistrationOptions({
        rpName,
        rpID: relayingPartyId,
        userName: user.identifiers[0].identifier, //hm: identifiers is a list of email addresses(?). This should be customizable?
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


export const createAuthenticationOptionsForUser = async () => {
  
  const options = await generateAuthenticationOptions({
    rpID: rpID,
    userVerification: 'preferred',
    allowCredentials: [],
  });
;

// (Pseudocode) Remember this challenge for this user
//setCurrentAuthenticationOptions(user, options);

return options;
};
// ^^^^
//These options can be passed directly into @simplewebauthn/browser's startAuthentication() method. ???

export const setRegistrationOptionsForUser = async (user:User, options: any) => {

   // setCurrentRegistrationOptions(user, options);

    return options;
}



export const verifyUserResponseAuth = async (verifyRPID: string, challenge: string) => {

  const authVerify = await verifyAuthenticationResponse({
    response: undefined,
    expectedChallenge: challenge,
    expectedOrigin: "",
    expectedRPID: verifyRPID,
    credential: {
      id: "",
      publicKey: undefined,
      counter: 0,
      transports: undefined
    }
  });

  return authVerify
  
}
