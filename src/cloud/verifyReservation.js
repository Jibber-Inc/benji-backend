import ExtendableError from 'extendable-error-class';

import Parse from '../providers/ParseProvider';
import generateAuthCode from '../utils/generateAuthCode';
import initiate2FAService from '../services/initiate2FAService';


class VerifyReservationError extends ExtendableError {}

/**
 *   //////////////////////////
 *  /// verify reservation ///
 * //////////////////////////
 *
 * GIVEN: A user has just downloaded the app
 * AND: They have entered a valid reservation code
 * AND: They DO NOT have an existing account
 * THEN: Then they are prompted to enter their phone number
 *
 * - Reservations will be pre made and have a code that is = to the objectId
 * - Reservations may have an attached user
 *
 * IF reservation == code AND reservation.user == NULL {
 *  then return the reservation
 * }
 *
 * IF reservation == code AND reservation.user != NULL {
 *  query for user THEN send verification code to that users phone number
 *  return reservation once code is sent
 * }
 *
 * IF no reservation matches code, return error
 *
 * @return {Parse.HttpResponse}
 */
const verifyReservation = async request => {

  const code = request.params.code;

  if (!code || typeof code !== 'string') {
    // Doesn't seem to be a way to return custom response status codes and handle
    // exceptions like this gracefully without blowing up the code/error log etc.
    // I want to return a 422 response here but doesn't seem that Parse will let me
    // It seems that Parse just "magically" handles these types of things in cloud
    // code for ex: https://github.com/parse-community/parse-server/issues/5348
    // 😠 Hopefully I am just wrong and there is something I'm missing...
    throw new VerifyReservationError('[KYUOOAOE] Missing "code" in request body');
  }

  // Build query
  const reservation_query = new Parse.Query('Reservation');
  reservation_query.equalTo('code', code);

  // Query for reservation
  let reservation = await reservation_query.first({ useMasterKey: true });

  // Throw if not found
  if (!reservation) {
    // @todo: add phone number to waitlist?
    throw new VerifyReservationError('[vR09CIUf] Reservation not found');
  }

  // Reservation found...
  if (reservation.has('user')) {

    // query for user
    const userQuery = new Parse.Query(Parse.User);
    const user_id = reservation.get('user').id;
    userQuery.equalTo('objectId', user_id);
    const user = await userQuery.first({ useMasterKey: true });

    // If user found initiate 2fa login
    if (user instanceof Parse.User) {
      const auth_code = generateAuthCode();
      initiate2FAService(auth_code, user);
    }
  }

  return reservation;
};


export default verifyReservation;
