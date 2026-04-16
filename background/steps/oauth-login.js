(function attachBackgroundStep6(root, factory) {
  root.MultiPageBackgroundStep6 = factory();
})(typeof self !== 'undefined' ? self : globalThis, function createBackgroundStep6Module() {
  function createStep6Executor(deps = {}) {
    const {
      addLog,
      completeStepFromBackground,
      getLoginAuthStateLabel,
      getState,
      isStep6RecoverableResult,
      isStep6SuccessResult,
      refreshOAuthUrlBeforeStep6,
      reuseOrCreateTab,
      runPreStep6CookieCleanup,
      sendToContentScriptResilient,
      shouldSkipLoginVerificationForCpaCallback,
      skipLoginVerificationStepsForCpaCallback,
      throwIfStopped,
    } = deps;

    async function executeStep6(state) {
      if (shouldSkipLoginVerificationForCpaCallback(state)) {
        await skipLoginVerificationStepsForCpaCallback();
        return;
      }
      if (!state.email) {
        throw new Error('缺少邮箱地址，请先完成步骤 3。');
      }

      await runPreStep6CookieCleanup();

      let attempt = 0;

      while (true) {
        throwIfStopped();
        attempt += 1;
        const currentState = attempt === 1 ? state : await getState();
        const password = currentState.password || currentState.customPassword || '';
        const oauthUrl = await refreshOAuthUrlBeforeStep6(currentState);

        if (attempt === 1) {
          await addLog('步骤 6：正在打开最新 OAuth 链接并登录...');
        } else {
          await addLog(`步骤 6：上一轮登录未进入验证码页，正在重新发起第 ${attempt} 轮登录尝试...`, 'warn');
        }

        await reuseOrCreateTab('signup-page', oauthUrl);

        const result = await sendToContentScriptResilient(
          'signup-page',
          {
            type: 'EXECUTE_STEP',
            step: 6,
            source: 'background',
            payload: {
              email: currentState.email,
              password,
            },
          },
          {
            timeoutMs: 180000,
            retryDelayMs: 700,
            logMessage: '步骤 6：认证页正在切换，等待页面重新就绪后继续登录...',
          }
        );

        if (result?.error) {
          throw new Error(result.error);
        }

        if (isStep6SuccessResult(result)) {
          await completeStepFromBackground(6, {
            loginVerificationRequestedAt: result.loginVerificationRequestedAt || null,
          });
          return;
        }

        if (isStep6RecoverableResult(result)) {
          const reasonMessage = result.message
            || `当前停留在${getLoginAuthStateLabel(result.state)}，准备重新执行步骤 6。`;
          await addLog(`步骤 6：${reasonMessage}`, 'warn');
          continue;
        }

        throw new Error('步骤 6：认证页未返回可识别的登录结果。');
      }
    }

    return { executeStep6 };
  }

  return { createStep6Executor };
});
