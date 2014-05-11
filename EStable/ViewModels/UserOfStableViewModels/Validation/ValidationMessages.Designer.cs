﻿//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:4.0.30319.34011
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace EStable.ViewModels.UserOfStableViewModels.Validation {
    using System;
    
    
    /// <summary>
    ///   A strongly-typed resource class, for looking up localized strings, etc.
    /// </summary>
    // This class was auto-generated by the StronglyTypedResourceBuilder
    // class via a tool like ResGen or Visual Studio.
    // To add or remove a member, edit your .ResX file then rerun ResGen
    // with the /str option, or rebuild your VS project.
    [global::System.CodeDom.Compiler.GeneratedCodeAttribute("System.Resources.Tools.StronglyTypedResourceBuilder", "4.0.0.0")]
    [global::System.Diagnostics.DebuggerNonUserCodeAttribute()]
    [global::System.Runtime.CompilerServices.CompilerGeneratedAttribute()]
    internal class ValidationMessages {
        
        private static global::System.Resources.ResourceManager resourceMan;
        
        private static global::System.Globalization.CultureInfo resourceCulture;
        
        [global::System.Diagnostics.CodeAnalysis.SuppressMessageAttribute("Microsoft.Performance", "CA1811:AvoidUncalledPrivateCode")]
        internal ValidationMessages() {
        }
        
        /// <summary>
        ///   Returns the cached ResourceManager instance used by this class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Resources.ResourceManager ResourceManager {
            get {
                if (object.ReferenceEquals(resourceMan, null)) {
                    global::System.Resources.ResourceManager temp = new global::System.Resources.ResourceManager("EStable.ViewModels.UserOfStableViewModels.Validation.ValidationMessages", typeof(ValidationMessages).Assembly);
                    resourceMan = temp;
                }
                return resourceMan;
            }
        }
        
        /// <summary>
        ///   Overrides the current thread's CurrentUICulture property for all
        ///   resource lookups using this strongly typed resource class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Globalization.CultureInfo Culture {
            get {
                return resourceCulture;
            }
            set {
                resourceCulture = value;
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Please enter a valid email address..
        /// </summary>
        internal static string EmailAddressInvalid {
            get {
                return ResourceManager.GetString("EmailAddressInvalid", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to If you have a fax number it must be less than 20 digits..
        /// </summary>
        internal static string Fax_InvalidNumber {
            get {
                return ResourceManager.GetString("Fax_InvalidNumber", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your GST Number should be nine digits long, please enter it without dashes, eg 123456789..
        /// </summary>
        internal static string GstNumberInvalid {
            get {
                return ResourceManager.GetString("GstNumberInvalid", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your GST Rate must contain a percent, please leave the % sign out. eg 15..
        /// </summary>
        internal static string GstRateInvalid {
            get {
                return ResourceManager.GetString("GstRateInvalid", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your GST Rate must not be empty..
        /// </summary>
        internal static string GstRateShouldNotBeEmpty {
            get {
                return ResourceManager.GetString("GstRateShouldNotBeEmpty", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your legal entity name must be between 1-50 charaters..
        /// </summary>
        internal static string LegalEntity_IncorrectLength {
            get {
                return ResourceManager.GetString("LegalEntity_IncorrectLength", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your mobile number must be between 1-20 digits..
        /// </summary>
        internal static string Mobile_InvalidNumber {
            get {
                return ResourceManager.GetString("Mobile_InvalidNumber", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to If you have a phone number it must be less than 20 digits..
        /// </summary>
        internal static string Phone_InvalidNumber {
            get {
                return ResourceManager.GetString("Phone_InvalidNumber", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your previous GSTRate must contain a percent, please leave the % sign out. eg 15..
        /// </summary>
        internal static string PreviousGstRate_ShouldNotBeEmpty {
            get {
                return ResourceManager.GetString("PreviousGstRate_ShouldNotBeEmpty", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your stable name must be between 1-50 characters long..
        /// </summary>
        internal static string StableName_IncorrectLength {
            get {
                return ResourceManager.GetString("StableName_IncorrectLength", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Please select a stable type..
        /// </summary>
        internal static string StableType_Invalid {
            get {
                return ResourceManager.GetString("StableType_Invalid", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Your trainer name must be bnetween 1-50 characters..
        /// </summary>
        internal static string TrainerName_IncorrectLength {
            get {
                return ResourceManager.GetString("TrainerName_IncorrectLength", resourceCulture);
            }
        }
    }
}
