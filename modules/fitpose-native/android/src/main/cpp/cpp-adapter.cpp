#include <jni.h>
#include <fbjni/fbjni.h>
#include "FitposeNativeOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::fitposenative::registerAllNatives();
  });
}