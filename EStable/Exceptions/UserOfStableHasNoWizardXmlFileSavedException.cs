using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace EStable.Exceptions
{
    public class UserOfStableHasNoWizardXmlFileSavedException : Exception
    {
        protected string StableName { get; set; }

        public UserOfStableHasNoWizardXmlFileSavedException(string stableName)
        {
            StableName = stableName;
        }
    }
}