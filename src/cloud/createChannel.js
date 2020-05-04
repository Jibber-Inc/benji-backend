// Vendor
import ExtendableError from 'extendable-error-class';

// Services
import ChatService from '../services/ChatService';

export class CreateChannelError extends ExtendableError {}

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createChannel = async request => {
  const { user, params } = request;
  const { uniqueName, friendlyName, context, type, members } = params;
  try {
    if (!user) throw new CreateChannelError('User need to be authenticated.');
    // create channel
    const channel = await ChatService.createChatChannel(
      user,
      uniqueName,
      friendlyName,
      type,
      { context },
    );
    // send invites to members
    await ChatService.inviteMembers(channel.uniqueName, members);
    return {
      channel,
    };
  } catch (error) {
    throw new CreateChannelError(error.message);
  }
};

export default createChannel;