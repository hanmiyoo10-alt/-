# Probe 9: preserve Java exception propagation

Probe 8 ARM diagnostic wrappers converted JavaException(pointer) and JavaExceptionUnwind into FatalError. JavaMethod::run_with_unwind and Method::run require those original variants to restore an exception handler or deliver the exception to the JVM. This is a confirmed diagnostic-code defect, consistent with the screenshot's raw Java exception pointer. The original exception class and gameplay cause remain unknown.

Probe 9 passes both variants unchanged through all four diagnostic boundaries: ARM engine, SVC, WIPI native call and timer. Other errors retain diagnostic context. Exceptions are not suppressed. Probe 7 null framebuffer guard remains.

CI now runs all wie-ktf library tests, including native entry points and exception raw-class/vtable matching, before APK creation. Device behavior remains unverified.
