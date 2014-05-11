
using System;
using System.IO;
using System.Xml.Serialization;
using EStable.Constants;
using EStable.Helpers;
using EStable.ViewModels.UserOfStableViewModels.Validation;
using FluentValidation.Attributes;

namespace EStable.Models.Wizard
{
    [XmlRoot]
    [Validator(typeof(StableWizardBaseValidator))]
    public class StableWizardBase
    {
        [XmlElement]
        public string Email { get; set; }
        
        [XmlElement]
        public string StableName { get; set; }

        public bool IsValid { get; set; }

        public StableWizardBase()
        {
            IsValid = true;
        }
        public string ToXml()
        {
            return XmlSerializationHelper.Serialize(this);
        }
    }
}