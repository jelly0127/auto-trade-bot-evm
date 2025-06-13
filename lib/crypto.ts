import crypto from 'crypto-js';

export const decryptData = async (encryptedData: string, ivHex: string, signature: string) => {
  try {
    // 将十六进制IV转换为WordArray
    const iv = crypto.enc.Hex.parse(ivHex);

    // 确保密钥长度正确
    const keyString =
      process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '5F4DCC3B5AA765D61D8327DEB882CF99B32E89CFD2B8E9573647FE11C8940895';
    // 如果密钥是hex格式，解析为WordArray
    const key = crypto.enc.Hex.parse(keyString);

    // 将Base64格式的加密数据转换为crypto-js可以处理的格式
    const ciphertext = crypto.enc.Base64.parse(encryptedData);

    // 创建加密包
    const cipherParams = crypto.lib.CipherParams.create({
      ciphertext: ciphertext,
    });

    // 使用AES解密
    const decrypted = crypto.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: crypto.mode.CBC,
      padding: crypto.pad.Pkcs7,
    });

    // 转换为文本
    const decryptedText = decrypted.toString(crypto.enc.Utf8);
    if (!decryptedText) {
      console.error('解密后数据为空');
      throw new Error('解密后数据为空');
    }

    try {
      return JSON.parse(decryptedText);
    } catch (jsonError) {
      console.error('JSON解析错误:', jsonError);
      throw new Error('解析JSON失败: ' + decryptedText.substring(0, 50) + '...');
    }
  } catch (error) {
    console.error('解密数据失败:', error);
    // 为了调试，返回更详细的错误信息
    throw new Error(`解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};
