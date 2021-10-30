import FeedService from '../../services/FeedService';
import ChatService from '../../services/ChatService';
import Parse from '../../providers/ParseProvider';

import { CHANNEL_INVITE_POST } from '../../constants/index';

/**
 * EventType - string - Always onChannelUpdated
 * ChannelSid - string - Channel String Identifier
 * Attributes - string, optional, JSON structure
 *            - The arbitrary JSON structure of the channel
 * DateCreated - date string, - The date of creation of the channel
 * DateUpdated - date string - The date of update of the channel
 * CreatedBy - string - The identity of the user that created a channel
 * FriendlyName - string, optional - The friendly name of the channel, if set
 * UniqueName - string, optional - The unique name of the channel, if set
 * ChannelType - string - The Channel type. Either private or public
 */
const onChannelUpdated = async (request, response) => {
  const { ChannelSid, Identity } = request.body;
  try {
    const user = await new Parse.Query(Parse.User).get(Identity);
    const channel = await ChatService.fetchChannel(ChannelSid);
    if (channel.status === 'invited') {
      return response.status(200).json(post);
    }
    return response.status(200).json(channel);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

export default onChannelUpdated;
