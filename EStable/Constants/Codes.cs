namespace EStable.Constants
{
    public static class Codes
    {
        public static class Azure
        {
            public static class Storage
            {
                public const string ConnectionStringName = "StorageConnectionString";
                public class ContainerNames
                {
                    public const string StableWizard = "stable-wizard-xml-files";
                }
            }
        }
        public static class FilePaths
        {
            public const string WizardXml = @"stablewizard\";
        }

        public static class Cookies
        {
            public static class Login
            {
                public const string Key = "LoginData";
                public const string UserType = "UserType";
                public const string UserId = "UserId";
                public const string LastVisit = "LastVisit";
            }

            public static class Wizard
            {
                const string Prefix = "Wizard";
                public static class StepOne
                {
                    public const string Key = Prefix + "StepOne";
                    public const string Email = Prefix + "Email";
                    public const string StableName = Prefix + "StableName";
                    public const string Address = Prefix + "StepAddress";
                    public const string Jurisdiction = Prefix + "Jurisdiction";
                    public const string Phone = Prefix + "PhoneNumber";
                    public const string FirstName = Prefix + "FirstName";
                    public const string LastName = Prefix + "LastName";
                    public const string StableType = Prefix + "StableType";
                    public const string Mobile = Prefix + "Mobile";
                    public const string Trainer = Prefix + "Trainer";
                    public const string Fax = Prefix + "Fax";
                }
                public  static class StepTwo
                {
                    public const string Key = Prefix + "StepTwo";
                    public const string GSTNumber = Prefix + "GSTNumber";
                    public const string GSTRate = Prefix + "GSTRate";
                    public const string GSTEffectiveDate = Prefix + "GSTEffectiveDate";
                    public const string NextInvoiceNumber = Prefix + "NextInvoiceNumber";
                    public const string PreviousGSTRate = Prefix + "PreviousGSTRate";
                }

                public static class StepThree
                {
                    public const string Key = "StepThree";

                    public const string SelectedStableType = "StableType";
                }
                public static class StepFour
                {
                    public const string Key = "StepFour";
                }
                public static class StepFive
                {
                    public const string Key = "StepFive";
                }
                public static class StepSix
                {
                    public const string Key = "StepSix";
                }
                public static class StepSeven
                {
                    public const string Key = "StepSeven";
                }
                public static class StepEight
                {
                    public const string Key = "StepEight";
                }

                public static class StepZero
                {
                    public const string Key = "StepZero";

                    public const string Email = "Email";
                }
            }
        }

        public class UserType
        {
            public const string Stable = "USERTYPE/STABLE";
        }

        public class UserTypeCode
        {
            public const char Stable = 'S';
            public const char Owner = 'O';
            public const char Admin = 'A';
        }

        public class StableTypeCode
        {
            public const int Thoroughbred = 1;
            public const int Harness = 2;
            public const int Greyhound = 3;
            public const int ThoroughbredUpdated = 4;
        }

        public class StableType
        {
            public const string Thoroughbred = "Thoroughbred";
            public const string Pacer = "Pacer";
            public const string Trotter = "Trotter";
            public const string Greyhound = "Greyhound";
            public const string Other = "Other";
        }

        public class StoredProcedure
        {
            public class AddUserOfStable
            {
                public const string Name = "sp_Add_User_of_Stable_Portal";
                public const string Email = "inp_User_Email";
                public const string Password = "inp_User_Password";
                public const string Active = "inp_Active_Ind";
                public const string ForcePWChange = "inp_Force_PW_Change";
                public const string LastAccessedStableId = "inp_Last_Accessed_Stable_ID";
                public const string FirstName = "inp_Firstname";
                public const string LastName = "inp_Lastname";
            }

            public class GetUserOfStableByEmail
            {
                public const string Name = "sp_Get_User_by_Email";
                public const string StableType = "inp_User_Type";
                public const string Email = "inp_Email";

            }
        }

        public class FileType
        {

            public const string Key = "FILETYPE/";
            public const string Xml = Key + "XML";

            public const string StableRegistration = Key + "StableReg";
        }
    }
}