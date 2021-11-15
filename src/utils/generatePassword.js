const { JIBBER_SECRET_PASSWORD_TOKEN } = process.env;

/**
 * Using the JIBBER_SECRET_PASSWORD_TOKEN variable and authcode var, create a pw
 * @param {Number} authCode
 */
const generatePassword = authCode =>
  `${JIBBER_SECRET_PASSWORD_TOKEN}${authCode}`;

export default generatePassword;
