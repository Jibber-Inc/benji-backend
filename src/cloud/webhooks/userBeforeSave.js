// Vendor
import ExtendableError from 'extendable-error-class';

// Providers
import Parse from '../../providers/ParseProvider';

// Utils
import createHandle from '../../utils/createHandle';


class UserBeforeSaveError extends ExtendableError {}


/**
 * Before save webhook for users.
 * @param {Object} request
 */
const userBeforeSave = async request => {
  const user = request.object;

  if (!Boolean(user instanceof Parse.User)) {
    throw new UserBeforeSaveError(
      '[iHkt4G3p] Expected user in request.object'
    );
  }

  // Update reservation property on user
  const reservation = user.get('reservation');
  if (!!reservation) {

    // Query for reservation object
    const Reservation = Parse.Object.extend('Reservation');
    let reservationQuery = new Parse.Query(Reservation);
    reservationQuery.equalTo('objectId', reservation.id);
    return reservationQuery.first()

      // Update reservation "isClaimed" = true
      .then(reservation => {
        if (reservation.get('isClaimed') !== true) {
          reservation.set('isClaimed', true);
          return reservation.save();
        }
        return reservation;
      })

      // Update user handle
      .then(reservation => {
        if (!user.get('handle') && !!reservation) {
          const position = reservation.get('position');
          const phoneNumber = user.get('phoneNumber');
          const givenName = user.get('givenName');
          const familyName = user.get('familyName');
          if (!!phoneNumber && !!givenName && !!familyName) {
            const handle = createHandle(givenName, familyName, position);
            user.set('handle', handle);
          }
        }
      });
  }
};


export default userBeforeSave;