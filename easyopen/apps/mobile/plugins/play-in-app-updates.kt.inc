  private val playUpdateManager by lazy { AppUpdateManagerFactory.create(this) }
  private var updateOffered = false
  private var restartOffered = false
  private var updateActivityResumed = false
  private var updateDialog: AlertDialog? = null

  private val playUpdateLauncher =
    registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
      if (result.resultCode != RESULT_OK && result.resultCode != RESULT_CANCELED) {
        Log.w("EasyOpenUpdate", "Google Play could not start the update")
      }
    }

  private val playUpdateListener = InstallStateUpdatedListener { state ->
    if (state.installStatus() == InstallStatus.DOWNLOADED) {
      runOnUiThread { offerUpdateRestart() }
    }
  }

  @Suppress("DEPRECATION")
  private fun installedFromGooglePlay(): Boolean =
    packageManager.getInstallerPackageName(packageName) == "com.android.vending"

  override fun onStart() {
    super.onStart()
    if (installedFromGooglePlay()) playUpdateManager.registerListener(playUpdateListener)
  }

  override fun onResume() {
    super.onResume()
    updateActivityResumed = true
    if (!installedFromGooglePlay()) return

    playUpdateManager.appUpdateInfo.addOnSuccessListener(this) { info ->
      if (!updateActivityResumed || isFinishing || isDestroyed) return@addOnSuccessListener
      if (info.installStatus() == InstallStatus.DOWNLOADED) {
        offerUpdateRestart()
      } else if (!updateOffered &&
        info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
        info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
      ) {
        updateOffered = true
        playUpdateManager.startUpdateFlowForResult(
          info,
          playUpdateLauncher,
          AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
        )
      }
    }
  }

  override fun onPause() {
    updateActivityResumed = false
    super.onPause()
  }

  override fun onStop() {
    if (installedFromGooglePlay()) playUpdateManager.unregisterListener(playUpdateListener)
    super.onStop()
  }

  private fun offerUpdateRestart() {
    if (!updateActivityResumed || restartOffered || isFinishing || isDestroyed) return
    restartOffered = true
    updateDialog = AlertDialog.Builder(this)
      .setTitle("업데이트 준비 완료")
      .setMessage("EasyOpen을 다시 시작하면 새 버전이 설치됩니다.")
      .setNegativeButton("나중에", null)
      .setPositiveButton("다시 시작") { _, _ ->
        playUpdateManager.completeUpdate().addOnFailureListener(this) {
          restartOffered = false
          if (updateActivityResumed && !isFinishing && !isDestroyed) {
            updateDialog = AlertDialog.Builder(this)
              .setMessage("업데이트를 설치하지 못했습니다. 앱을 다시 열거나 Play 스토어에서 업데이트해 주세요.")
              .setPositiveButton("확인", null)
              .show()
          }
        }
      }
      .show()
  }

  override fun onDestroy() {
    updateDialog?.dismiss()
    super.onDestroy()
  }
