using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Web;
using EStable.Models;
using MySql.Data.MySqlClient;

namespace EStable.Repositories
{
    public class StableRepository
    {
        public void Save(Stable stable)
        {
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var cmd = new MySqlCommand("sp_Add_Stable", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };

                PopulateStableParameters(stable, cmd);

                cmd.ExecuteScalar();
            }
        }

        public Stable GetByLegalEntity(string legalEntity)
        {
            var stable = new Stable();
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            { 
                conn.Open();
                var cmd = new MySqlCommand("sp_Get_Stable_by_Legal_Name", conn)
                    {
                        CommandType = System.Data.CommandType.StoredProcedure
                    };
                cmd.Parameters.Add(new MySqlParameter("inp_Legal_Name", legalEntity));
                using (MySqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        stable = new Stable()
                            {
                                Id = reader.GetInt16("Stable_ID"),
                                StableTypeId = reader.GetInt16("Stable_Type_ID"),
                                CountryCode = reader.GetInt16("Country_Code").ToString(),
                                StableName = reader.GetString("Stable_Name"),
                                Trainer = reader.GetString("Trainer"),
                                LegalName = reader.GetString("Legal_Name"),
                                Address = reader.GetString("Address"),
                                Mobile = reader.GetString("Mobile"),
                                Phone = reader.GetString("Phone"),
                                Fax = reader.GetString("Fax"),
                                TaxNumber = reader.GetString("GST_VAT_TAX_Number"),
                                GSTRateCurrent = reader.GetString("GST_Rate_Current"),
                                GSTEffectiveDate = reader.GetDateTime("GST_Effective_Date").ToString(),
                                GSTRatePrevious = reader.GetString("GST_Rate_Previous"),
                                NextInvoice = reader.GetInt16("Next_Invoice")
                            };
                    }
                }
            }
            return stable;
        }

        public void Update(Stable stable)
        {
            using (var conn = new MySqlConnection(ConfigurationManager.ConnectionStrings["EStable"].ConnectionString))
            {
                conn.Open();
                var cmd = new MySqlCommand("sp_Upd_Stable", conn)
                {
                    CommandType = System.Data.CommandType.StoredProcedure
                };

                PopulateStableParameters(stable, cmd);
                cmd.Parameters.Add(new MySqlParameter("inp_Stable_ID", stable.Id));

                cmd.ExecuteScalar();
            }
        }

        private static void PopulateStableParameters(Stable stable, MySqlCommand cmd)
        {
            cmd.Parameters.Add(new MySqlParameter("inp_Stable_Type_ID", stable.StableTypeId));
            cmd.Parameters.Add(new MySqlParameter("inp_Country_Code", stable.CountryCode ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Stable_Name", stable.StableName ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Trainer", stable.Trainer ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Legal_Name", stable.LegalName ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Address", stable.Address ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Mobile", stable.Mobile ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Phone", stable.Phone ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Fax", stable.Fax ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_GST_VAT_TAX_Number", stable.TaxNumber ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_GST_Rate_Current", stable.GSTRateCurrent ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_GST_Effective_Date", stable.GSTEffectiveDate ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_GST_Rate_Previous", stable.GSTRatePrevious ?? ""));
            cmd.Parameters.Add(new MySqlParameter("inp_Next_Invoice", stable.NextInvoice));
        }
    }
}