import Parse from '../../providers/ParseProvider';
import ExtendableError from 'extendable-error-class';

import createChatChannel from '../../utils/createChatChannel';


class UserAfterSaveError extends ExtendableError {}


/**
 * After save webhook for User objects.
 * @param {Object} request
 */
const userAfterSave = request => {
  const user = request.object;

  if (!Boolean(user instanceof Parse.User)) {
    throw new UserAfterSaveError(
      '[c4V3VYAu] Expected user in request.object'
    );
  }
  if (!Boolean(user.createdAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[hplRppBn] Expected user.createdAt to be instanceof Date'
    );
  }
  if (!Boolean(user.updatedAt instanceof Date)) {
    throw new UserAfterSaveError(
      '[3Npvri9X] Expected user.updatedAt to be instanceof Date'
    );
  }

  // Create new user chat channels
  // Since user.isNew() will always be false in the afterSave hook
  // we're comparing the createdAt/updatedAt timestamps to determine a new user
  if (user.createdAt === user.updatedAt) {
    Promise.all([
      createChatChannel(user, `Welcome_${user.id}`, 'Welcome!'),
      createChatChannel(user, `Feedback_${user.id}`, 'Feedback'),
      createChatChannel(user, `Ideas_${user.id}`, 'Ideas'),
    ]);
  }
};


export default userAfterSave;