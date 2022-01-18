import ExtendableError from 'extendable-error-class';
import UserService from '../services/UserService';
// Providers
import Parse from '../providers/ParseProvider';
// Constants
import UserStatus from '../constants/userStatus';
// Services
import ChatService from '../services/ChatService';
import PassService from '../services/PassService';
import ReservationService, { ReservationServiceError } from '../services/ReservationService';

// Load Environment Variables
const { CREATE_WELCOME_CONVERSATION } = process.env;

class FinalizeUserOnboardingError extends ExtendableError { }



// Users that come with a reservation has full access
// Users without a reservation are placed in a queue.
// Their position in the queue is set when they send the validation code
// The user status can be one of: active, inactive, waitlist
// If the position is higher than the max allowed position (maxQuePosition), they get the waitlist status
// Active: users that have full access to the application
// Inactive: users that have full access to the application, but they didnt end the onboarding yet
// Waitlist: users in the Waitlist have to wait until the maxQuePosition is increased, letting more users get full access.
const setUserStatus = async (user, reservation = null) => {
  // TODO: Uncomment when we use again the currentQuePosition logic.
  // Get the needed que values to calculate the user status
  // const config = await Parse.Config.get({ useMasterKey: true });
  // get maxQuePosition from parse. This variable is manually set depending on the needs
  // const maxQuePosition = config.get('maxQuePosition');
  // get the last position of the queue + 1. For more information, check db import.
  // let currentQuePosition = user.get('quePosition');

  // if (!currentQuePosition) {
  //   currentQuePosition = await db.getValueForNextSequence('unclaimedPosition');

  //   await QuePositionsService.update('unclaimedPosition', currentQuePosition);
  // }

  if (user.get('status') && user.get('status') !== 'active') {

    if (reservation) {
      user.set('status', 'inactive');
    } else {
      // TODO: Uncomment when we use again the currentQuePosition logic.
      // user.set('quePosition', currentQuePosition);
      // if (maxQuePosition >= currentQuePosition) {
      //   user.set('status', 'inactive');
      // } else {
      //   user.set('status', 'waitlist');
      // }
      user.set('status', 'waitlist');
    }
  }
};


const createInitialConversations = async (user, status) => {
  // At this point, if the user hasn't 'active' status, he/she is in the waitlist
  // So default chat channels won't be created for the user yet.

  // Here we create the user in Stream
  await UserService.connectUser(user);

  switch (status) {
    case UserStatus.USER_STATUS_ACTIVE:
      if (CREATE_WELCOME_CONVERSATION) {
        await ChatService.createInitialConversations(user);
      }
      break;

    case UserStatus.USER_STATUS_WAITLIST:
      await ChatService.createWaitlistConversation(user);
      break;

    default:
      break;
  }
};

/**
 * Sets the user's status from inactive to active
 * @param {*} request
 */
const finalizeUserOnboarding = async request => {
  const { user, params } = request;
  const { reservationId, passId } = params;

  try {
    if (!(user instanceof Parse.User)) {
      throw new FinalizeUserOnboardingError('User not found');
    }

    if (!user.get('givenName') && !user.get('familyName')) {
      throw new FinalizeUserOnboardingError('User givenName and familyName not set. Initial conversations not created.');
    }

    if (reservationId) {
      user.set('status', 'inactive');
      await ReservationService.handleReservation(reservationId, user);
    } else if (passId) {
      user.set('status', 'inactive');
      await PassService.handlePass(passId, user);
    } else {
      user.set('status', 'waitlist');
    }

    let updatedUser;
    let currentUserStatus = user.get('status');
    switch (currentUserStatus) {
      case UserStatus.USER_STATUS_ACTIVE:
      case UserStatus.USER_STATUS_WAITLIST:
        await createInitialConversations(user, currentUserStatus);
        break;

      case UserStatus.USER_STATUS_INACTIVE:
        updatedUser = await UserService.setActiveStatus(user);
        currentUserStatus = updatedUser.get('status');
        await createInitialConversations(user, currentUserStatus);
        break;

      default:
        throw new FinalizeUserOnboardingError('');
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof ReservationServiceError) {
      setUserStatus(user);
      user.save(null, { useMasterKey: true });
      throw error;
    }
    throw new FinalizeUserOnboardingError(error.message);
  }
};

export default finalizeUserOnboarding;