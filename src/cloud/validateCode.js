import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import generatePassword from '../utils/generatePassword';
import TwoFAService from '../services/TwoFAService';
import UserService from '../services/UserService';
import ReservationService, {
  ReservationServiceError,
} from '../services/ReservationService';
import QuePositionsService from '../services/QuePositionsService';
// Utils
import testUser from '../utils/testUser';
import db from '../utils/db';
import Stream from '../providers/StreamProvider'

class ValidateCodeError extends ExtendableError {}

const setReservations = async user => {
  const hasReservations = await ReservationService.hasReservations(user);
  if (!hasReservations) {
    // creates 3 reservations for the new user.
    // TODO: set this number as an app configuration.
    await ReservationService.createReservations(user, 3);
  }
};

// Users that come with a reservation has full access
// Users without a reservation are placed in a queue.
// Their position in the queue is set when they send the validation code
// The user status can be one of: active, inactive, waitlist
// If the position is higher than the max allowed position (maxQuePosition), they get the waitlist status
// Active: users that have full access to the application
// Inactive: users that have full access to the application, but they didnt end the onboarding yet
// Waitlist: users in the Waitlist have to wait until the maxQuePosition is increased, letting more users get full access.
const setUserStatus = async (user, reservation = null) => {
  // Get the needed que values to calculate the user status
  const config = await Parse.Config.get({ useMasterKey: true });
  // get maxQuePosition from parse. This variable is manually set depending on the needs
  const maxQuePosition = config.get('maxQuePosition');
  // get the last position of the queue + 1. For more information, check db import.
  let currentQuePosition = user.get('quePosition');

  if (!currentQuePosition) {
    currentQuePosition = await db.getValueForNextSequence('unclaimedPosition');

    await QuePositionsService.update('unclaimedPosition', currentQuePosition);
  }

  if (user.get('status') && user.get('status') !== 'active') {
    if (reservation) {
      user.set('status', 'inactive');
    } else {
      user.set('quePosition', currentQuePosition);
      if (maxQuePosition >= currentQuePosition) {
        user.set('status', 'inactive');
      } else {
        user.set('status', 'waitlist');
      }
    }
  }
};

const validateCode = async request => {
  const { params, installationId } = request;
  const { phoneNumber, authCode, reservationId } = params;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new ValidateCodeError(
      '[JXK8SYA4] No phone number provided in request',
    );
  }

  // Installation Id is required in request body
  if (!installationId) {
    throw new ValidateCodeError(
      '[STK8SYR9] No installationId provided in request header',
    );
  }

  // Auth code is required in request body
  if (!authCode) {
    throw new ValidateCodeError('[xDETWSYH] No auth code provided in request');
  }

  // Retrieve the user with the phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('phoneNumber', phoneNumber);
  const user = await userQuery.first({ useMasterKey: true });

  if (!(user instanceof Parse.User)) {
    throw new ValidateCodeError('[zIslmc6c] User not found');
  }

  try {
    if (user.get('smsVerificationStatus') !== 'approved') {
      let status;
      if (testUser.isTestUser(phoneNumber)) {
        status = testUser.validate(authCode);
      } else {
		  // TODO: Implement 2 factor authentication service from STREAM
         // const result = await TwoFAService.verifyCode(
		 //  user.get('phoneNumber'),
		 //  authCode,
		 // );
		 // status = result.status;
		  status = 'approved';
      }

      // If the code is wrong, status wont be approved
      if (status !== 'approved') {
        throw new ValidateCodeError('[KTN1RYO9] Auth code validation failed');
      }

      if (reservationId) {
        await ReservationService.claimReservation(reservationId, user);
      }

      await setUserStatus(user, reservationId);

      user.set('smsVerificationStatus', status);
      await user.save(null, { useMasterKey: true });

      setReservations(user);
    }

    const sessionToken = await UserService.getLastSessionToken(
      user,
      installationId,
    );
    // If no session token present login the user.
    if (!sessionToken) {
      const logged = await Parse.User.logIn(
        user.getUsername(),
        generatePassword(user.get('hashcode')),
        {
          installationId,
        },
      );
      return logged.getSessionToken();
    }

    const streamToken = Stream.client.createToken(user.id);

    return {
		parseSessionToken: sessionToken,
		streamToken
	};
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      setUserStatus(user);
      user.save(null, { useMasterKey: true });
      throw error;
    }
    throw new ValidateCodeError(`Validation error. Detail: ${error.message}`);
  }
};

export default validateCode;
