using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Domain;
using EStable.Exceptions;

namespace EStable.Security
{
    public interface IWizardSecurity
    {
        void VerifyUserCanSaveWizardInformation(string fileName, string stableName);
    }
    public class WizardSecurity : IWizardSecurity
    {
        public WizardSecurity()
        {
            
        }
        public void VerifyUserCanSaveWizardInformation(string fileName, string stableName)
        {
            if (String.IsNullOrEmpty(fileName))
            {
                throw new UserOfStableHasNoWizardXmlFileSavedException(stableName);
            }
        }
    }
}