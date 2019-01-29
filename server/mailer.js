'use strict';

const logger = require('./logger');
const { emailDomain, emailSender, emailId, emailPassword, testEmailReceiver } = require('../config')
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: emailDomain,
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: emailId, // generated ethereal user
        pass: emailPassword // generated ethereal password
    }
});


function sendMail(mailOptions) {
  return new Promise((resolve) => {
        transporter.sendMail(mailOptions, function(error, body){
            if (error) {
                logger.error('이메일 발송 중 에러 : ', error, mailOptions);
                resolve(false);
            } else {
                logger.log('이메일 발송함 : ', body)
                resolve(true);
            }
        });
    });
};

exports.sendEmailVerification = async function (userId, email, key) {
  const authLinkParams = `authSubmit?userId=${userId}&authKey=${key}`;

  return await sendMail({
        from: emailSender,
        to: process.env.NODE_ENV == 'development' ? testEmailReceiver : email,
        subject: 'Pedagy 교사 인증 메일입니다.',
        html: getEmailVerificaitonText(authLinkParams)
    });
};

exports.sendTempPasswordEmail = async function (email, pwd) {
  return await sendMail({
    from: emailSender,
    to: process.env.NODE_ENV == 'development' ? testEmailReceiver : email,
    subject: 'Pedagy 임시 비밀번호 발급 메일입니다.',
    html: getPasswordResetText(pwd)
  });
};

exports.sendFeedbackAlrim = async function (userId, feedback) {
  return await sendMail({
    from: emailSender,
    to: emailSender,
    subject: 'Pedagy 피드백 알림',
    text: `피드백 내용: ${feedback} \n 발신자: ${userId}`
  });
};

const getEmailVerificaitonText = function (param) {
  return `<div style="margin:0;padding:0">
  <link href="https://fonts.googleapis.com/css?family=Nanum+Gothic|Roboto:400,700" rel="stylesheet">
  <div style="max-width:100%;padding:15px;background-color:#f0f0f0;box-sizing:border-box">
  <table style="margin:0 auto;padding:0;width:100%;max-width:630px;font-family:'Roboto', 'Nanum Gothic', sans-serif'" cellspacing="0" cellpadding="0">
  <tbody>
  <tr style="background-color:#009688;height:50px">
  <td style="vertical-align:middle;padding-left:10px;padding-top:5px;"><a href="https://pedagy.com" style="font-family:'Roboto', sans-serif; height:40px;display:inline-block;color:white;font-size:1.8rem;text-decoration:none;" >Pedagy</a></td>
  </tr>
  <tr>
  <td style="padding:50px 20px;background:#fff">
  <table cellspacing="0" cellpadding="0">
  <tbody>
  <tr>
  <td style="padding:27px 0 17px;font-size:30px;line-height:34px;color:#333"><strong style="color:#009688;font-weight:normal">이메일 계정 인증</strong>안내</td>
  </tr>
  <tr>
  <td style="padding:10px 0 30px;font-size:15px;line-height:27px;color:#303030">안녕하세요. Pedagy입니다.<br>
  <br>
  본 메일은 회원님의 이메일 계정 인증을 위하여 발송된 것입니다.<br>
  아래의 버튼을 누르시면 인증이 완료됩니다.
  </tr>
  <tr>
  <td style="padding:30px 0 0;border-top:1px solid #e0e0e0">
  <a href="https://pedagy.com/${param}" style="border-radius:none;border:1px solid #009688;cursor:pointer;color:#fff;text-align:center;font-size:1.2rem;display:inline-block;background-color:#009688;font-family:'NanumGothic';font-weight:normal;text-decoration:none; padding:12px 30px;"><span style="height:40px;">인증하기</span></a>
  </td>
  </tr>
  <tr>
  <td style="padding-top:30px;font-size:15px;line-height:27px;color:#303030">감사합니다.<br>
  <br>
  <strong style="color:#333">선생님들의 노다지, Pedagy 드림</strong>
  </td>
  </tr>
  </tbody>
  </table>
  </td>
  </tr>
  <tr>
  <td style="padding:25px 0;background:#f0f0f0">
  <table style="margin:0;padding:0;width:100%" cellspacing="0" cellpadding="0">
  <tbody>
  <tr>
  <td style="font-size:13px;line-height:20px;color:#666;text-align:center">
  <br>
  문의 : <a href="mailto:webmaster@pedagy.com" style="color:#666;text-decoration:none" target="_blank">webmaster@pedagy.com</a><br>
  © <a href="https://pedagy.com" style="color:#666;text-decoration:none">Pedagy</a></td>
  </tr>
  </tbody>
  </table>
  </td>
  </tr>
  </tbody>
  </table>
  </div>
  </div>`

};

const getPasswordResetText = function (newPassword) {
  return `<div style="margin:0;padding:0"> 
  <link href="https://fonts.googleapis.com/css?family=Nanum+Gothic|Roboto:400,700" rel="stylesheet"> 
  <div style="max-width:100%;padding:15px;background-color:#f0f0f0;box-sizing:border-box"> 
  <table style="margin:0 auto;padding:0;width:100%;max-width:630px;font-family:'Roboto', sans-serif" cellspacing="0" cellpadding="0"> 
  <tbody> 
  <tr style="background-color:#009688;height:50px"> 
  <td style="vertical-align:middle;padding-left:10px;padding-top:5px;"><a href="https://pedagy.com" style="font-family:'Roboto', sans-serif ; height:40px;display:inline-block;color:white;font-size:1.8rem;text-decoration:none;" >Pedagy</a></td> 
  </tr> 
  <tr> 
  <td style="padding:50px 20px;background:#fff"> 
  <table cellspacing="0" cellpadding="0"> 
  <tbody> 
  <tr> 
  <td style="padding:27px 0 17px;font-size:30px;line-height:34px;color:#333"><strong style="color:#009688;font-weight:normal">임시비밀번호 발급</strong>안내</td> 
  </tr> 
  <tr> 
  본 메일은 회원님의 임시 비밀번호 발급을 위하여 발송된 것입니다.<br> 
  발급된 임시 비밀번호는 아래와 같습니다. 
  </tr> 
  <tr> 
  <td style="padding:30px 0 0;border-top:1px solid #e0e0e0"> 
  ${newPassword}
  </td> 
  </tr> 
  <tr> 
  <td style="padding-top:30px;font-size:15px;line-height:27px;color:#303030">감사합니다.<br> 
  <br> 
  <strong style="color:#333">Pedagy 드림</strong> 
  </td> 
  </tr> 
  </tbody> 
  </table> 
  </td> 
  </tr> 
  <tr> 
  <td style="padding:25px 0;background:#f0f0f0"> 
  <table style="margin:0;padding:0;width:100%" cellspacing="0" cellpadding="0"> 
  <tbody> 
  <tr>
  <td style="font-size:13px;line-height:20px;color:#666;text-align:center">
  <br>
  이메일 : <a href="mailto:webmaster@pedagy.com" style="color:#666;text-decoration:none" target="_blank">webmaster@pedagy.com</a><br>
  © <a href="https://pedagy.com" style="color:#666;text-decoration:none">Pedagy</a></td>
  </tr>
  </tbody> 
  </table> 
  </td> 
  </tr> 
  </tbody> 
  </table> 
  </div> 
  </div>`
};